# Progressive Classes - Student Management System

A comprehensive web application for managing student registrations, class bookings, study materials, and administrative functions.

## ✨ Features

### 🔐 User Authentication
- **Student Registration**: Complete signup form with all required fields
- **Login System**: Support for email/mobile + password authentication
- **Google Sign-In**: Integration with Google OAuth for seamless login
- **Password Recovery**: Forgot password functionality
- **User Profiles**: Personal information management

### 📚 Study Materials
- **Secure Access**: Materials only accessible to logged-in users
- **Download System**: One-click download for study resources
- **Filtering**: Search by subject and grade level
- **Admin Upload**: Teachers can upload new materials

### 👥 User Management (Admin)
- **User List**: View all registered students
- **Search & Filter**: Find users by name, email, or mobile
- **Status Control**: Activate/suspend user accounts
- **Account Deletion**: Remove user accounts permanently
- **Export to Excel**: Automatic CSV export for each registration

### 🎓 Class Management
- **Batch Creation**: Admin can create new class batches
- **Student Enrollment**: Students can book available classes
- **Capacity Management**: Automatic status updates
- **Teacher Assignment**: Assign teachers to specific batches

### 🖼️ Gallery Management
- **Image Upload**: Admin can add new gallery images
- **Category Organization**: Organize images by type
- **Responsive Display**: Beautiful grid layout for all devices

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (for development)

### Installation
1. Clone or download the project files
2. Navigate to the project directory
3. Start a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
4. Open `http://localhost:8000` in your browser

### Google Sign-In Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Replace `YOUR_GOOGLE_CLIENT_ID` in `script.js` with your actual client ID

## 👨‍💼 Admin Access

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**Admin Capabilities:**
- Manage user accounts (activate/suspend/delete)
- Create and manage class batches
- Upload study materials
- Manage gallery images
- View user statistics

## 📊 Data Export

The system automatically exports user registration data to CSV format:
- **Format**: CSV (compatible with Excel)
- **Fields**: Student Name, Parent Name, Email, Mobile, Grade, School, Subjects, Address, Registration Date, Status
- **Trigger**: Automatic export on each new user registration

## 🎨 Customization

### Colors and Themes
- Primary color: `#6366f1` (Indigo)
- Secondary color: `#1e293b` (Slate)
- All colors are defined as CSS variables for easy customization

### Responsive Design
- Mobile-first approach
- Breakpoints: 768px, 480px
- Optimized for all device sizes

## 🔧 Technical Details

### Frontend Technologies
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Vanilla JS with modern features
- **Font Awesome**: Icon library
- **Google Fonts**: Inter font family

### Data Storage
- **LocalStorage**: Client-side data persistence
- **CSV Export**: Excel-compatible data export
- **Session Management**: User authentication state

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📱 Mobile Features

- Touch-friendly interface
- Responsive navigation
- Optimized forms for mobile input
- Swipe gestures support

## 🔒 Security Features

- Password validation
- User session management
- Admin-only access controls
- Input sanitization
- CSRF protection (basic)

## 🚧 Future Enhancements

- [ ] Email verification system
- [ ] Two-factor authentication
- [ ] Payment integration
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Offline functionality

## 📞 Support

For technical support or questions:
- Email: progressiveclasses365@gmail.com
- Phone: +91 99004500365

## 📄 License

This project is proprietary software developed for Progressive Classes.

---

**Developed with ❤️ for Progressive Classes**
