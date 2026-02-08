# 02-DATABASE-SETUP.md

## Database Setup (Neon)

### Step 1: Create Neon Account

1. Go to [neon.com](https://neon.com)
2. Sign up for a free account
3. Complete organization setup

**See:** Fig.2.0.

![Fig.2.0](../images/fig2_0.png)  
<p align="center"><em>Fig.2.0: Neon database</em></p>

### Step 2: Create New Project

1. Click **"New Project"**
2. Name your project (e.g., "canva-clone")
3. Click **"Create"**

**See:** Fig.2.1.

![Fig.2.1](../images/fig2_1.png)  
<p align="center"><em>Fig.2.1: Database creatoin</em></p>

### Step 3: Get Connection String

1. In your project dashboard, click **"Connect"**
2. Copy the connection string
3. **Important:** Remove `&channel_binding=require` from the end

**Example:**
```
Before: postgresql://user:pass@host/db?sslmode=require&channel_binding=require
After:  postgresql://user:pass@host/db?sslmode=require
```

**See:** Fig.2.2, Fig.2.3.

![Fig.2.2](../images/fig2_2.png)  
<p align="center"><em>Fig.2.2: Project Dashboard</em></p>

![Fig.2.3](../images/fig2_3.png)  
<p align="center"><em>Fig.2.3: Copy your connection string</em></p>

### Step 4: Add to Environment File

Open `.env` and add:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

**See:** Fig.2.4.

![Fig.2.4](../images/fig2_4.png)  
<p align="center"><em>Fig.2.4: DATABASE_URL && AUTH_SECRET</em></p>

### Step 5: Generate Auth Secret

Run this command:

```bash
openssl rand -base64 32
```

Copy the output and add to `.env`:

```env
AUTH_SECRET=your_generated_secret_here
```

**What is AUTH_SECRET?**  
Encrypts JWT tokens, cookies, and session data for NextAuth.js authentication.


### Step 6: Run Database Migrations

```bash
# Generate schema files
bun run db:generate

# Apply migrations
bun run db:migrate
```

**What these do:**
- `db:generate` - Creates database schema files from Drizzle config
- `db:migrate` - Applies schema changes to your database

**See:** Fig.2.5.

![Fig.2.5](../images/fig2_5.png)  
<p align="center"><em>Fig.2.5: Database schema && migration process</em></p>


### Step 7: Open Database Studio (Optional)

```bash
bun run db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio` where you can view/edit your database.

**See:** Fig.2.6, Fig.2.6.

![Fig.2.6](../images/fig2_6.png)  
<p align="center"><em>Fig.2.6: Drizzle studio, where your data is saved</em></p>

![Fig.2.7](../images/fig2_7.png)  
<p align="center"><em>Fig.2.7: Drizzle via Neon db</em></p>


### Step 8: Test the Application

```bash
bun dev
```

Your app should now run at `http://localhost:3000` without errors!

Add to `.env`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**See:** Fig.2.8.

![Fig.2.8](../images/fig2_8.png)  
<p align="center"><em>Fig.2.8: Now it is working on localhost:3000</em></p>


### Step 9: Create First Account

1. Open `http://localhost:3000`
2. Click "Sign Up"
3. Create an account with email/password
4. You'll be redirected to the dashboard

**See:** Fig.2.9.

![Fig.2.9](../images/fig2_9.png)  
<p align="center"><em>Fig.2.9: Dashboard Page</em></p>


---

**✅ Database setup complete!**

---

**Previous:** [01-INSTALLATION.md](./01-INSTALLATION.md)  
**Next:** [03-UNSPLASH-API.md](./03-UNSPLASH-API.md)

---
