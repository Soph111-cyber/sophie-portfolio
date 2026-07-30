import html
import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import unquote, urlparse

import streamlit as st
from supabase import Client, create_client

MEDIA_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "mp4", "mov", "m4v", "webm"]
LEGACY_WIDTHS = {"Small": 20, "Medium": 40, "Large": 60, "Full width": 100}

st.set_page_config(
    page_title="Sophie's Portfolio",
    page_icon="✦",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
    .stApp {background: linear-gradient(180deg, #fffdf8 0%, #f6f2ea 100%);}
    .block-container {max-width: 1480px; padding-top: 2.5rem; padding-bottom: 5rem;}
    h1, h2, h3 {font-family: Georgia, 'Times New Roman', serif;}
    .hero {padding: 2.4rem 0 1.8rem; border-bottom: 1px solid rgba(60,50,40,.18); margin-bottom: 2rem;}
    .eyebrow {letter-spacing: .18em; text-transform: uppercase; font-size: .78rem; color: #7d6b57;}
    .subtitle {font-size: 1.08rem; color: #5d554d; max-width: 720px; line-height: 1.7;}
    .portfolio-card {background: rgba(255,255,255,.82); border: 1px solid rgba(90,70,50,.13); border-radius: 18px; padding: .9rem; margin-bottom: 1rem; box-shadow: 0 8px 24px rgba(70,50,30,.05);}
    .media-flex {display:flex; flex-wrap:wrap; gap:10px; align-items:flex-start;}
    .media-item {overflow:hidden; border-radius:10px; background:#eee9e1; min-width:0;}
    .media-item img, .media-item video {width:100%; height:auto; max-height:520px; object-fit:contain; display:block; border-radius:10px;}
    .media-item video {background:#111;}
    .caption {font-size:.96rem; line-height:1.65; color:#3e3934; margin-top:.7rem;}
    .meta {font-size:.76rem; color:#8a8178; margin-top:.5rem;}
    [data-testid="stSidebar"] {display:none;}
    .manage-box {padding:1rem 0; border-bottom:1px solid rgba(90,70,50,.13);}
    @media (max-width:760px) {
      .media-item {width:100% !important;}
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def secret(name: str, default: str | None = None) -> str | None:
    try:
        return st.secrets[name]
    except Exception:
        return os.getenv(name, default)


def get_supabase() -> Client:
    url = secret("SUPABASE_URL")
    key = secret("SUPABASE_KEY")
    if not url or not key:
        st.error("Portfolio storage is not configured yet. Add SUPABASE_URL and SUPABASE_KEY in Streamlit Secrets.")
        st.stop()
    return create_client(url, key)


def is_admin() -> bool:
    return bool(st.session_state.get("admin_authenticated"))


def check_password(password: str) -> bool:
    expected = secret("ADMIN_PASSWORD")
    return bool(expected) and password == expected


def normalize_widths(raw_values: list[Any], count: int) -> list[int]:
    widths: list[int] = []
    for value in list(raw_values)[:count]:
        if isinstance(value, str) and value in LEGACY_WIDTHS:
            widths.append(LEGACY_WIDTHS[value])
            continue
        try:
            width = int(value)
        except (TypeError, ValueError):
            width = 20
        widths.append(max(15, min(100, width)))
    widths.extend([20] * (count - len(widths)))
    return widths


def normalize_types(raw_values: list[str], count: int) -> list[str]:
    values = list(raw_values)[:count]
    values.extend([""] * (count - len(values)))
    return values


def load_entries(client: Client) -> list[dict[str, Any]]:
    response = (
        client.table("portfolio_entries")
        .select("id,description,media_urls,media_types,media_sizes,display_order,created_at")
        .order("display_order", desc=False)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def upload_file(client: Client, uploaded_file: Any) -> tuple[str, str]:
    safe_name = "".join(
        char if char.isalnum() or char in ".-_" else "_"
        for char in uploaded_file.name
    )
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    path = f"uploads/{stamp}_{safe_name}"
    content_type = uploaded_file.type or "application/octet-stream"
    client.storage.from_("portfolio-media").upload(
        path,
        uploaded_file.getvalue(),
        {"content-type": content_type, "upsert": "false"},
    )
    return client.storage.from_("portfolio-media").get_public_url(path), content_type


def storage_path_from_url(url: str) -> str | None:
    marker = "/portfolio-media/"
    path = urlparse(url).path
    if marker not in path:
        return None
    return unquote(path.split(marker, 1)[1])


def render_gallery(entries: list[dict[str, Any]]) -> None:
    if not entries:
        st.info("The portfolio gallery is being curated. Please check back soon.")
        return

    for entry in entries:
        urls = list(entry.get("media_urls") or [])
        types = normalize_types(entry.get("media_types") or [], len(urls))
        widths = normalize_widths(entry.get("media_sizes") or [], len(urls))

        media_parts: list[str] = []
        for index, url in enumerate(urls):
            safe_url = html.escape(url, quote=True)
            width = widths[index]
            if types[index].startswith("video/"):
                element = f'<video src="{safe_url}" controls preload="metadata"></video>'
            else:
                element = f'<img src="{safe_url}" loading="lazy" alt="Portfolio media">'
            media_parts.append(
                f'<div class="media-item" style="width:calc({width}% - 10px);">{element}</div>'
            )

        description = html.escape(entry.get("description", ""))
        created = html.escape(str(entry.get("created_at", ""))[:10])
        description_html = f'<div class="caption">{description}</div>' if description else ""
        created_html = f'<div class="meta">Added {created}</div>' if created else ""

        st.markdown(
            '<div class="portfolio-card">'
            f'<div class="media-flex">{"".join(media_parts)}</div>'
            f'{description_html}{created_html}'
            '</div>',
            unsafe_allow_html=True,
        )


def update_entry_media(
    client: Client,
    entry_id: int,
    urls: list[str],
    types: list[str],
    widths: list[int],
) -> None:
    client.table("portfolio_entries").update(
        {
            "media_urls": urls,
            "media_types": types,
            "media_sizes": [str(width) for width in widths],
        }
    ).eq("id", entry_id).execute()


def move_media(client: Client, entry: dict[str, Any], index: int, direction: int) -> None:
    urls = list(entry.get("media_urls") or [])
    types = normalize_types(entry.get("media_types") or [], len(urls))
    widths = normalize_widths(entry.get("media_sizes") or [], len(urls))
    target = index + direction
    if target < 0 or target >= len(urls):
        return
    for values in (urls, types, widths):
        values[index], values[target] = values[target], values[index]
    update_entry_media(client, entry["id"], urls, types, widths)


def set_media_width(client: Client, entry: dict[str, Any], index: int, width: int) -> None:
    urls = list(entry.get("media_urls") or [])
    types = normalize_types(entry.get("media_types") or [], len(urls))
    widths = normalize_widths(entry.get("media_sizes") or [], len(urls))
    if 0 <= index < len(widths):
        widths[index] = width
        update_entry_media(client, entry["id"], urls, types, widths)


def append_media(client: Client, entry: dict[str, Any], files: list[Any]) -> None:
    urls = list(entry.get("media_urls") or [])
    types = normalize_types(entry.get("media_types") or [], len(urls))
    widths = normalize_widths(entry.get("media_sizes") or [], len(urls))
    for uploaded_file in files:
        url, media_type = upload_file(client, uploaded_file)
        urls.append(url)
        types.append(media_type)
        widths.append(20)
    update_entry_media(client, entry["id"], urls, types, widths)


def delete_media(client: Client, entry: dict[str, Any], index: int) -> None:
    urls = list(entry.get("media_urls") or [])
    types = normalize_types(entry.get("media_types") or [], len(urls))
    widths = normalize_widths(entry.get("media_sizes") or [], len(urls))
    if index < 0 or index >= len(urls):
        return

    removed_url = urls.pop(index)
    types.pop(index)
    widths.pop(index)
    storage_path = storage_path_from_url(removed_url)
    if storage_path:
        try:
            client.storage.from_("portfolio-media").remove([storage_path])
        except Exception:
            pass

    if urls:
        update_entry_media(client, entry["id"], urls, types, widths)
    else:
        client.table("portfolio_entries").delete().eq("id", entry["id"]).execute()


def move_entry(client: Client, entries: list[dict[str, Any]], index: int, direction: int) -> None:
    target = index + direction
    if target < 0 or target >= len(entries):
        return
    current = entries[index]
    other = entries[target]
    current_order = int(current.get("display_order") or index + 1)
    other_order = int(other.get("display_order") or target + 1)
    client.table("portfolio_entries").update({"display_order": other_order}).eq("id", current["id"]).execute()
    client.table("portfolio_entries").update({"display_order": current_order}).eq("id", other["id"]).execute()


client = get_supabase()

st.markdown(
    """
    <div class="hero">
      <div class="eyebrow">Selected work · field notes · experiments</div>
      <h1>Sophie's Portfolio</h1>
      <p class="subtitle">A living archive of projects across archaeology, mathematics, technology, design, and cultural storytelling.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

view_tab, admin_tab = st.tabs(["Exhibition", "Private Studio"])

with view_tab:
    try:
        render_gallery(load_entries(client))
    except Exception as exc:
        st.error(f"The gallery could not be loaded: {exc}")

with admin_tab:
    if not is_admin():
        st.subheader("Private Studio")
        st.caption("Authorized access only")
        with st.form("login_form"):
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Unlock")
        if submitted:
            if check_password(password):
                st.session_state.admin_authenticated = True
                st.rerun()
            else:
                st.error("Incorrect password.")
    else:
        header_left, header_right = st.columns([5, 1])
        with header_left:
            st.subheader("Add a portfolio entry")
        with header_right:
            if st.button("Lock"):
                st.session_state.admin_authenticated = False
                st.rerun()

        with st.form("upload_form", clear_on_submit=True):
            files = st.file_uploader(
                "Photos or videos",
                type=MEDIA_EXTENSIONS,
                accept_multiple_files=True,
            )
            description = st.text_area(
                "Description",
                height=150,
                placeholder="Explain the project, process, question, or story behind these materials...",
            )
            publish = st.form_submit_button("Publish to exhibition", type="primary")

        if publish:
            if not files:
                st.warning("Please upload at least one photo or video.")
            else:
                try:
                    existing = load_entries(client)
                    next_order = max([int(item.get("display_order") or 0) for item in existing] or [0]) + 1
                    urls: list[str] = []
                    types: list[str] = []
                    with st.spinner("Publishing..."):
                        for uploaded_file in files:
                            url, media_type = upload_file(client, uploaded_file)
                            urls.append(url)
                            types.append(media_type)
                        client.table("portfolio_entries").insert(
                            {
                                "description": description.strip(),
                                "media_urls": urls,
                                "media_types": types,
                                "media_sizes": ["20"] * len(urls),
                                "display_order": next_order,
                            }
                        ).execute()
                    st.success("Published successfully ✦")
                    st.rerun()
                except Exception as exc:
                    st.error(f"Upload failed: {exc}")

        st.divider()
        st.subheader("Manage published entries")
        st.caption("Move entries, append media, resize proportionally, reorder, or remove items.")

        try:
            entries = load_entries(client)
            for entry_index, entry in enumerate(entries):
                st.markdown('<div class="manage-box">', unsafe_allow_html=True)
                heading = st.columns([4, 1, 1, 1])
                with heading[0]:
                    preview = (entry.get("description") or "Untitled entry").strip()
                    st.markdown(f"**{preview[:120] + ('…' if len(preview) > 120 else '')}**")
                with heading[1]:
                    if st.button("Move up", key=f"entry_up_{entry['id']}", disabled=entry_index == 0, use_container_width=True):
                        move_entry(client, entries, entry_index, -1)
                        st.rerun()
                with heading[2]:
                    if st.button("Move down", key=f"entry_down_{entry['id']}", disabled=entry_index == len(entries) - 1, use_container_width=True):
                        move_entry(client, entries, entry_index, 1)
                        st.rerun()
                with heading[3]:
                    if st.button("Delete entry", key=f"delete_entry_{entry['id']}", use_container_width=True):
                        client.table("portfolio_entries").delete().eq("id", entry["id"]).execute()
                        st.rerun()

                with st.expander("Add photos or videos to this entry"):
                    new_files = st.file_uploader(
                        "Select one or more files",
                        type=MEDIA_EXTENSIONS,
                        accept_multiple_files=True,
                        key=f"append_files_{entry['id']}",
                    )
                    if st.button("Add to this entry", key=f"append_button_{entry['id']}", type="primary"):
                        if not new_files:
                            st.warning("Please select at least one file.")
                        else:
                            with st.spinner("Adding media..."):
                                append_media(client, entry, new_files)
                            st.success("Media added.")
                            st.rerun()

                urls = list(entry.get("media_urls") or [])
                types = normalize_types(entry.get("media_types") or [], len(urls))
                widths = normalize_widths(entry.get("media_sizes") or [], len(urls))
                if urls:
                    media_columns = st.columns(min(5, len(urls)), gap="small")
                    for index, url in enumerate(urls):
                        with media_columns[index % len(media_columns)]:
                            if types[index].startswith("video/"):
                                st.video(url)
                            else:
                                st.image(url, use_container_width=True)
                            chosen_width = st.slider(
                                "Width (%)",
                                min_value=15,
                                max_value=100,
                                value=widths[index],
                                step=5,
                                key=f"width_{entry['id']}_{index}",
                            )
                            if st.button("Apply width", key=f"apply_width_{entry['id']}_{index}", use_container_width=True):
                                set_media_width(client, entry, index, chosen_width)
                                st.success(f"Width saved: {chosen_width}%")
                                st.rerun()
                            left, right = st.columns(2)
                            with left:
                                if st.button("←", key=f"left_{entry['id']}_{index}", disabled=index == 0, use_container_width=True):
                                    move_media(client, entry, index, -1)
                                    st.rerun()
                            with right:
                                if st.button("→", key=f"right_{entry['id']}_{index}", disabled=index == len(urls) - 1, use_container_width=True):
                                    move_media(client, entry, index, 1)
                                    st.rerun()
                            if st.button("Remove", key=f"remove_{entry['id']}_{index}", use_container_width=True):
                                delete_media(client, entry, index)
                                st.rerun()
                st.markdown("</div>", unsafe_allow_html=True)
        except Exception as exc:
            st.error(f"Entries could not be managed: {exc}")
