# Sophie's Portfolio

A Streamlit portfolio for college-application supplementary materials. It includes:

- A public exhibition board for photos, videos, and descriptions
- A password-protected private studio
- Multiple-file photo/video uploads
- Persistent cloud storage using Supabase
- Entry deletion from the admin studio

## 1. Create the GitHub repository

Create a public repository named `sophie-portfolio`, then upload all files in this folder. Do **not** upload a real `secrets.toml` file.

## 2. Configure Supabase

1. Create a free Supabase project.
2. Open **SQL Editor** and run `supabase_setup.sql`.
3. In **Project Settings → API**, copy:
   - Project URL
   - anon/public key

## 3. Deploy with Streamlit Community Cloud

1. Open Streamlit Community Cloud and choose **Create app**.
2. Select your `sophie-portfolio` GitHub repository.
3. Set the main file path to `app.py`.
4. In **Advanced settings → Secrets**, add:

```toml
ADMIN_PASSWORD = "your-private-password"
SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"
```

5. Deploy and test both tabs.

## Security note

Never place the real password directly inside `app.py`, because a public GitHub repository exposes its source code. The password belongs only in Streamlit Secrets.

For a college portfolio, upload only materials you are comfortable making public. Avoid private addresses, personal IDs, confidential research data, and images of others without permission.
