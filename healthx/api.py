import json
import re
from typing import Any, Iterable, List, Tuple

import frappe
from frappe import _
from frappe.utils import get_fullname

DOCNAME_PATTERN = re.compile(r"^[A-Za-z0-9 _-]+$")
FIELD_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")
ALLOWED_OPERATORS = {
    "=": "=",
    "!=": "!=",
    ">": ">",
    "<": "<",
    ">=": ">=",
    "<=": "<=",
    "like": "LIKE",
    "in": "IN",
}


@frappe.whitelist(allow_guest=True)
def web_login(usr: str, pwd: str):
    """Custom web login endpoint that keeps users on the website."""
    if not usr or not pwd:
        frappe.throw(_("Username and password are required"))

    login_manager = frappe.auth.LoginManager()
    login_manager.authenticate(user=usr, pwd=pwd)
    login_manager.post_login()

    csrf_token = frappe.local.session.data.csrf_token
    return {
        "message": "Logged In",
        "user": frappe.session.user,
        "csrf_token": csrf_token,
    }


@frappe.whitelist(allow_guest=True)
def get_session_profile():
    """Return session user info and roles without exposing sensitive fields.

    This route is guest-safe and ignores DocType permissions so website users can fetch
    their roles immediately after login.
    """
    user = frappe.session.user
    is_authenticated = bool(user and user != "Guest")

    if is_authenticated:
        roles = frappe.db.get_all(
            "Has Role",
            filters={"parent": user},
            pluck="role",
            ignore_permissions=True,
        )
    else:
        roles = ["Guest"]

    return {
        "user": user,
        "full_name": get_fullname(user) if is_authenticated else "Guest",
        "roles": roles,
        "is_authenticated": is_authenticated,
    }


def ensure_website_user_role():
    """Utility helper to recreate Website User role if missing."""
    if frappe.db.exists("Role", "Website User"):
        return "Website User already present"

    role = frappe.get_doc(
        {
            "doctype": "Role",
            "role_name": "Website User",
            "desk_access": 0,
            "key": "website_user",
        }
    )
    role.insert(ignore_permissions=True)
    frappe.db.commit()
    return "Website User role created"


def ensure_role_permission_for_doctype(role="Website User"):
    """Grant read permission on DocType DocType"""
    from frappe.permissions import add_permission

    add_permission("DocType", role, permlevel=0, ptype="read")
    frappe.db.commit()


def _validate_doctype(value: str) -> str:
    if not value or not DOCNAME_PATTERN.match(value):
        frappe.throw(_("Invalid DocType: {0}").format(value))
    if not frappe.db.exists("DocType", value):
        frappe.throw(_("DocType {0} does not exist").format(value))
    return value


def _validate_field(fieldname: str) -> str:
    if not fieldname or not FIELD_PATTERN.match(fieldname):
        frappe.throw(_("Invalid field name: {0}").format(fieldname))
    return fieldname


def _build_filter_clause(field: str, operator: Any, value: Any) -> Tuple[str, List[Any]]:
    sql_operator = (operator or "=").strip().lower()
    if sql_operator not in ALLOWED_OPERATORS:
        frappe.throw(_("Unsupported operator: {0}").format(operator))

    sql_operator = ALLOWED_OPERATORS[sql_operator]
    column = f"`{field}`"

    if sql_operator == "IN":
        if not isinstance(value, (list, tuple)) or not value:
            frappe.throw(_("IN filters require a list of values."))
        placeholders = ", ".join(["%s"] * len(value))
        return f"{column} IN ({placeholders})", list(value)

    return f"{column} {sql_operator} %s", [value]


def _parse_filters(filters: Any) -> Tuple[str, List[Any]]:
    if not filters:
        return "", []

    if isinstance(filters, str):
        stripped = filters.strip()
        if not stripped:
            return "", []
        try:
            parsed = json.loads(stripped)
        except (TypeError, ValueError, json.JSONDecodeError):
            return "", []
    else:
        parsed = filters

    clauses: List[str] = []
    values: List[Any] = []

    if isinstance(parsed, dict):
        items = parsed.items()
    elif isinstance(parsed, (list, tuple)):
        items = parsed
    else:
        return "", []

    for entry in items:
        if isinstance(parsed, dict):
            field, raw_value = entry
            operator = "="
            value = raw_value
            if isinstance(raw_value, (list, tuple)) and len(raw_value) == 2:
                operator, value = raw_value
            elif isinstance(raw_value, dict):
                operator = raw_value.get("operator", "=")
                value = raw_value.get("value")
        else:
            if not isinstance(entry, (list, tuple)) or len(entry) < 3:
                continue
            field, operator, value = entry[:3]

        field = _validate_field(str(field))
        clause, clause_values = _build_filter_clause(field, operator, value)
        clauses.append(clause)
        values.extend(clause_values)

    if clauses:
        return " WHERE " + " AND ".join(clauses), values
    return "", values


def _parse_order_by(order_by: Any) -> str:
    if not order_by:
        return ""

    parsed = order_by
    if isinstance(order_by, str):
        stripped = order_by.strip()
        if not stripped:
            return ""
        try:
            parsed = json.loads(stripped)
        except (TypeError, ValueError, json.JSONDecodeError):
            parsed = stripped

    if isinstance(parsed, str):
        parts: Iterable[str] = [segment.strip() for segment in parsed.split(",") if segment.strip()]
    elif isinstance(parsed, (list, tuple)):
        parts = parsed
    else:
        return ""

    clauses: List[str] = []
    for part in parts:
        if isinstance(part, str):
            tokens = part.split()
            field = tokens[0]
            direction = tokens[1].upper() if len(tokens) > 1 else "ASC"
        elif isinstance(part, (list, tuple)):
            field = part[0]
            direction = str(part[1]).upper() if len(part) > 1 else "ASC"
        else:
            continue

        field = _validate_field(str(field))
        if direction not in {"ASC", "DESC"}:
            continue
        clauses.append(f"`{field}` {direction}")

    if clauses:
        return " ORDER BY " + ", ".join(clauses)
    return ""


def _parse_limit(limit: Any, start: Any) -> str:
    try:
        limit_value = int(limit or 20)
    except (TypeError, ValueError):
        limit_value = 20
    limit_value = max(1, min(limit_value, 1000))

    try:
        offset_value = int(start or 0)
    except (TypeError, ValueError):
        offset_value = 0
    offset_value = max(0, offset_value)

    clause = f" LIMIT {limit_value}"
    if offset_value:
        clause += f" OFFSET {offset_value}"
    return clause


@frappe.whitelist(allow_guest=True)
def fetch_docs_sql(doctype: str, fields=None, filters=None, order_by=None, limit: Any = 20, start: Any = 0):
    """Return DocType data via parameterized SQL (guest safe, ignores DocType perms)."""
    if not doctype:
        return []

    if not frappe.db.exists("DocType", doctype):
        frappe.log_error(
            title="healthx.fetch_docs_sql.missing_doctype",
            message=f"DocType {doctype} not found",
        )
        return []

    table_name = f"tab{doctype}"
    if not frappe.db.has_table(table_name):
        frappe.log_error(
            title="healthx.fetch_docs_sql.missing_table",
            message=f"DocType {doctype} does not have physical table {table_name}",
        )
        return []

    parsed_fields = fields
    if isinstance(fields, str):
        stripped = fields.strip()
        if stripped:
            try:
                parsed_fields = json.loads(stripped)
            except (TypeError, ValueError, json.JSONDecodeError):
                parsed_fields = [segment.strip() for segment in stripped.split(",") if segment.strip()]
        else:
            parsed_fields = None

    if not parsed_fields:
        parsed_fields = ["name"]
    elif isinstance(parsed_fields, str):
        parsed_fields = [parsed_fields]

    table_columns = set(frappe.db.get_table_columns(table_name) or [])
    selected_fields: List[str] = []
    for field in parsed_fields:
        fieldname = str(field)
        if fieldname not in table_columns:
            frappe.log_error(
                title="healthx.fetch_docs_sql.invalid_column",
                message=f"DocType: {doctype}, field: {fieldname}",
            )
            continue
        selected_fields.append(f"`{_validate_field(fieldname)}`")

    if not selected_fields:
        selected_fields = ["`name`"]
    select_clause = ", ".join(selected_fields)

    query = f"SELECT {select_clause} FROM `{table_name}`"
    where_clause, values = _parse_filters(filters)
    order_clause = _parse_order_by(order_by) or " ORDER BY `modified` DESC"
    limit_clause = _parse_limit(limit, start)

    rows = frappe.db.sql(query + where_clause + order_clause + limit_clause, values, as_dict=True)
    return rows


