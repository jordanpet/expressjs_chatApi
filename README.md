# expressjs_chatApi

# ExpressJS Chat API

A real-time chat and restaurant management API built with **Express.js** and **MongoDB**, featuring authentication, messaging, category/menu handling, and file upload functionality.  

## 🚀 Features

- **Authentication & Security**
  - User signup (`/api/sign_up`) and login (`/api/login`)
  - Email validation and password authentication
  - Token-based authentication (JWT)
  - Forgot password flow:
    - `/api/forgot_password_request`
    - `/api/forgot_password_verify`
    - `/api/forgot_password_set_now`

- **Category & Menu Management**
  - CRUD endpoints for categories, menus, menu items
  - Soft delete (status-based)
  - Validation for required parameters

- **Restaurant Management**
  - Endpoints for adding, updating, listing, and deleting restaurants
  - `/api/admin/restaurant_offer_add`, update, delete, list
  - `/api/admin/about_add`, update, delete, list
  - Active/Inactive toggling

- **Portion & Ingredient Management**
  - CRUD operations for portions and ingredients
  - Validation checks for parameters

- **Messaging Module**
  - Centralized messages module for consistent responses
  - Improved modularity by replacing hardcoded messages

- **File Uploads**
  - Endpoints for single and multiple image uploads
  - Validation for file paths and request parameters
  - Enhanced logging for debugging

- **Code Quality**
  - Refactored signup/login logic
  - Streamlined database interactions
  - Removed unused code for optimization

## 🛠️ Tech Stack
- **Backend:** Express.js
- **Database:** MongoDB
- **Auth:** JWT, bcrypt
- **File Uploads:** Multer
- **Validation & Messaging:** Custom modules for consistency

## 📂 Project Setup

```bash
# Clone the repository
git clone https://github.com/jordanpet/expressjs_chatApi.git

# Install dependencies
npm install

# Start the server
npm start

