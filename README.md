# LMS setup (Windows)

1. Open Supabase > SQL Editor, paste all of schema.sql, click Run.
   (Authentication > Providers > Email: turn OFF "Confirm email" for easy testing.)
2. Copy .env.example to a new file named .env and fill in your
   Supabase URL and anon key (Project Settings > API).
3. In a terminal inside this folder:
      npm.cmd install
      npm.cmd run dev
4. Open http://localhost:5173
