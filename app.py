import os
from datetime import datetime, timezone
from typing import Any

import streamlit as st
from supabase import Client, create_client

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
    .block-container {max-width: 1320px; padding-top: 2.5rem; padding-bottom: 5rem;}
    h1, h2, h3 {font-family: Georgia, 'Times New Roman', serif;}
    .hero {padding: 2.4rem 0 1.8rem; border-bottom: 1px solid rgba(60,50,40,.18); margin-bottom: 2rem;}
    .eyebrow {letter-spacing: .18em; text-transform: uppercase; font-size: .78rem; color: #7d6b57;}
    .subtitle {font-size: 1.08rem; color: #5d554d; max-width: 720px; line-height: 1.7;}
    .card {background: rgba(255,255,255,.8); border: 1px solid rgba(90,70,50,.13); border-radius: 20px; padding: 1rem; margin-bottom: 1.2rem; box-shadow: 0 10px 30px rgba(70,50,30,.06);}
    .caption {font-size: 1rem; line-height: 1.7; color: #3e3934; margin-top: .7rem;}
    .meta {font-size: .78rem; color: #8a8178; margin-top: .6rem;}
    [data-testid="stSidebar"] {display:none;}
    [data-testid="stImage"] img {border-radius: 13px; max-height: 420px; object-fit: cover;}
    video {border-radius: 13px; max-height: 420px; background: #111;}
    .manage-box {padding: .8rem 0; border-bottom: 1px solid rgba(90,70,50,.13);}
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


def load_entries(client: Client) -> list[dict[str, Any]]:
    result = (
        client.table("portfolio_entries")
        .select("id,description,media_urls,media_types,created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def upload_file(client: Client, uploaded_file: Any) -> tuple[str, str]:
    original = uploaded_file.name
    safe_name = "".join(c if c.isalnum() or c in ".-_" else "_" for c in original)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    path = f"uploads/{stamp}_{safe_name}"
    raw = uploaded_file.getvalue()
    content_type = uploaded_file.type or "application/octet-stream"
    client.storage.from_("portfolio-media").upload(
        path,
        raw,
        {"content-type": content_type, "upsert": "false"},
    )
    public_url = client.storage.from_("portfolio-media").get_public_url(path)
    return public_url, content_type


def render_media(url: str, media_type: str) -> None:
    if media_type.startswith("video/"):
        st.video(url)
    else:
        st.image(url, use_container_width=True)


def render_gallery(entries: list[dict[str, Any]]) -> None:
    if not entries:
        st.info("The portfolio gallery is being curated. Please check back soon.")
        return

    for entry in entries:
        st.markdown('<div class="card">', unsafe_allow_html=True)
        urls = entry.get("media_urls") or []
        types = entry.get("media_types") or []

        if len(urls) == 1:
            left, center, right = st.columns([1, 2, 1], gap="small")
            with center:
                render_media(urls[0], types[0] if types else "")
        else:
            columns = st.columns(3, gap="small")
            for idx, url in enumerate(urls):
                media_type = types[idx] if idx < len(types) else ""
                with columns[idx % 3]:
                    render_media(url, media_type)

        description = entry.get("description", "")
        if description:
            st.markdown(f'<div class="caption">{description}</div>', unsafe_allow_html=True)
        created = str(entry.get("created_at", ""))[:10]
        if created:
            st.markdown(f'<div class="meta">Added {created}</div>', unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)


def move_media(client: Client, entry: dict[str, Any], index: int, direction: int) -> None:
    urls = list(entry.get("media_urls") or [])
    types = list(entry.get("media_types") or [])
    target = index + direction
    if target < 0 or target >= len(urls):
        return

    urls[index], urls[target] = urls[target], urls[index]
    while len(types) < len(urls):
        types.append("")
    types[index], types[target] = types[target], types[index]

    client.table("portfolio_entries").update(
        {"media_urls": urls, "media_types": types}
    ).eq("id", entry["id"]).execute()


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
        top_left, top_right = st.columns([5, 1])
        with top_left:
            st.subheader("Add a portfolio entry")
        with top_right:
            if st.button("Lock"):
                st.session_state.admin_authenticated = False
                st.rerun()

        with st.form("upload_form", clear_on_submit=True):
            files = st.file_uploader(
                "Photos or videos",
                type=["png", "jpg", "jpeg", "webp", "gif", "mp4", "mov", "m4v", "webm"],
                accept_multiple_files=True,
            )
            description = st.text_area(
                "Description",
                height=160,
                placeholder="Explain the project, process, question, or story behind these materials...",
            )
            publish = st.form_submit_button("Publish to exhibition", type="primary")

        if publish:
            if not files:
                st.warning("Please upload at least one photo or video.")
            else:
                try:
                    urls: list[str] = []
                    media_types: list[str] = []
                    with st.spinner("Publishing..."):
                        for file in files:
                            url, media_type = upload_file(client, file)
                            urls.append(url)
                            media_types.append(media_type)
                        client.table("portfolio_entries").insert(
                            {
                                "description": description.strip(),
                                "media_urls": urls,
                                "media_types": media_types,
                            }
                        ).execute()
                    st.success("Published successfully ✦")
                    st.rerun()
                except Exception as exc:
                    st.error(f"Upload failed: {exc}")

        st.divider()
        st.subheader("Manage published entries")
        st.caption("Use the arrow buttons to change the order of photos and videos inside each entry.")
        try:
            entries = load_entries(client)
            for entry in entries:
                st.markdown('<div class="manage-box">', unsafe_allow_html=True)
                heading_cols = st.columns([5, 1])
                with heading_cols[0]:
                    preview = (entry.get("description") or "Untitled entry").strip()
                    st.markdown(f"**{preview[:120] + ('…' if len(preview) > 120 else '')}**")
                with heading_cols[1]:
                    if st.button("Delete", key=f"delete_{entry['id']}"):
                        client.table("portfolio_entries").delete().eq("id", entry["id"]).execute()
                        st.success("Entry deleted.")
                        st.rerun()

                urls = entry.get("media_urls") or []
                types = entry.get("media_types") or []
                if urls:
                    media_columns = st.columns(min(4, len(urls)), gap="small")
                    for idx, url in enumerate(urls):
                        with media_columns[idx % len(media_columns)]:
                            media_type = types[idx] if idx < len(types) else ""
                            if media_type.startswith("video/"):
                                st.video(url)
                            else:
                                st.image(url, width=150)
                            st.caption(f"Position {idx + 1}")
                            left_button, right_button = st.columns(2)
                            with left_button:
                                if st.button(
                                    "←",
                                    key=f"left_{entry['id']}_{idx}",
                                    disabled=idx == 0,
                                    use_container_width=True,
                                ):
                                    move_media(client, entry, idx, -1)
                                    st.rerun()
                            with right_button:
                                if st.button(
                                    "→",
                                    key=f"right_{entry['id']}_{idx}",
                                    disabled=idx == len(urls) - 1,
                                    use_container_width=True,
                                ):
                                    move_media(client, entry, idx, 1)
                                    st.rerun()
                st.markdown("</div>", unsafe_allow_html=True)
        except Exception as exc:
            st.error(f"Entries could not be managed: {exc}")
