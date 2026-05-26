# RoomRadar Project Synopsis

## 1. Title of the Project

**RoomRadar: AI-Powered Room Rental and Booking Platform**

RoomRadar is a full-stack MERN web application designed to simplify room discovery, listing management, booking requests, tenant-landlord communication, admin moderation and AI-assisted user support through a single digital platform.

## 2. Student and Submission Details

**Project Type:** B.Tech Major Project / Final Year Project  
**Domain:** PropTech, Web Application, Rental Management System  
**Technology Stack:** MERN Stack  
**Frontend:** React.js, Vite, Tailwind CSS  
**Backend:** Node.js, Express.js  
**Database:** MongoDB with Mongoose  
**Other Integrations:** Socket.IO, Cloudinary, Multer, JWT, AI chatbot assistance

**Submitted By:**  
Name: __________________________  
Roll No.: _______________________  
Branch: _________________________  
Semester: _______________________  

**Submitted To:**  
Guide Name: _____________________  
Department: _____________________  
Institute: ______________________  
Academic Year: __________________

## 3. Abstract

RoomRadar is an AI-powered room rental and booking platform developed to solve common problems faced by students, travellers, working professionals and landlords in the rental accommodation process. Traditional room searching often depends on offline brokers, scattered social media posts, incomplete information, delayed communication and limited trust between tenants and property owners. These issues make the room discovery process time-consuming, uncertain and inconvenient.

The proposed system provides a centralized digital platform where travellers or tenants can search for rooms based on location, price, room type, availability and other filters. Landlords can list rooms, manage booking requests, communicate with interested users and maintain their rental inventory. Admin users can monitor platform activities, verify listings, manage users, review reports and moderate support workflows.

The project uses React.js and Vite for the frontend, Node.js and Express.js for the backend, MongoDB for database storage and Socket.IO for real-time chat and notifications. JWT-based authentication, role-based access control, upload validation, cloud image storage and admin moderation features are used to improve security and trust. AI chatbot assistance and smart search features make the platform more interactive and user-friendly.

RoomRadar aims to deliver an end-to-end rental workflow from room search to booking request, communication, review and platform support. The system improves transparency, reduces dependency on middlemen and provides a scalable base for future enhancements such as online payments, mobile applications, AI recommendations and multilingual support.

## 4. Introduction

Accommodation search is an important need for students, travellers and working professionals who move to new cities for education, jobs, internships or short-term stays. In many areas, the rental process is still handled through offline brokers, local contacts, printed advertisements or informal social media posts. These methods often lack verified information, updated availability, proper room images, transparent pricing and direct communication channels.

RoomRadar is developed as a web-based rental platform that brings room discovery, landlord listing management, booking requests and communication into one organized system. The platform is role-based and supports three major user categories: travellers or tenants, landlords and administrators. Each role receives a separate workflow according to its responsibilities.

Travellers can search rooms, view details, save favourites, send booking requests, communicate with landlords and track application status. Landlords can add rooms, upload images, update listing information, manage applications and view business insights. Admins can review users, listings, support tickets, reports and platform settings to maintain trust and safety.

The application follows a MERN architecture with a React frontend, Express backend and MongoDB database. Real-time chat is implemented using Socket.IO. Image upload and storage are supported using Multer and Cloudinary. Authentication and role permissions are managed using JWT and protected routes.

## 5. Problem Statement

The current room rental process is often unorganized, slow and unreliable. Users searching for rooms face problems such as incomplete listings, fake information, lack of verified images, limited filtering options, delayed landlord responses and unclear booking status. Landlords also face difficulty in reaching genuine tenants, managing multiple inquiries and keeping listing data updated.

There is a need for a centralized digital platform that allows users to discover rooms, compare options, communicate with landlords, submit booking requests and receive transparent status updates. The platform should also provide admin-level moderation to reduce fraud, spam and disputes.

Therefore, the problem is to design and develop a secure, role-based room rental and booking platform that supports room search, listing management, booking workflow, real-time communication, document/image uploads, reviews, notifications and admin moderation.

## 6. Motivation

The motivation behind RoomRadar is to make room rental search easier, faster and more trustworthy. Many students and working professionals shift to new cities and require affordable accommodation near colleges, offices or important locations. At the same time, landlords need a reliable way to publish room availability and connect with interested tenants.

A digital solution can reduce manual effort, improve transparency and provide a better user experience. Features such as location-based search, verified listings, direct chat, status tracking, reviews and admin support can make the rental process more organized and dependable.

## 7. Objectives

The major objectives of RoomRadar are:

1. To develop a full-stack web application for room discovery and booking management.
2. To provide separate role-based interfaces for travellers, landlords and admins.
3. To allow landlords to add, update, manage and monitor room listings.
4. To allow travellers to search rooms using filters such as city, budget, room type and availability.
5. To implement booking request and application tracking features.
6. To provide real-time chat between tenants and landlords.
7. To support image upload and listing media management.
8. To provide reviews, notifications and support ticket workflows.
9. To implement admin moderation for users, rooms, reports and platform settings.
10. To improve user experience using AI chatbot assistance and smart search features.
11. To ensure basic security through authentication, authorization, validation and protected routes.
12. To design the system in a scalable way for future deployment and feature expansion.

## 8. Scope of the Project

RoomRadar covers the complete workflow of a room rental marketplace from listing creation to booking communication and support. The project scope includes:

- User registration and login.
- Role-based access for traveller, landlord and admin.
- Room listing creation and management.
- Search and filter-based room discovery.
- Room detail pages with images, amenities, location and rent details.
- Booking request submission and tracking.
- Landlord-side application review.
- Real-time chat and inquiry handling.
- Wishlist and saved room support.
- Reviews and guest feedback.
- Notifications and status updates.
- Image upload using secure upload flow.
- Admin dashboard for moderation.
- Support ticket and issue reporting.
- AI chatbot assistance for user queries.
- Basic analytics and insights for admin and landlord workflows.

The current scope focuses on the web application. Future versions can include production payment gateway integration, native mobile applications, advanced AI recommendations and multilingual support.

## 9. Existing System

In the existing offline or semi-digital rental process, users generally search rooms through brokers, personal contacts, posters, local advertisements, WhatsApp groups, Facebook posts or unverified listing websites. These systems do not always provide structured data, updated availability or proper communication.

Common problems in the existing system are:

- Listings may be incomplete or outdated.
- Room photos may be missing or unreliable.
- Users cannot easily compare multiple rooms.
- Location relevance is difficult to judge.
- Communication with landlords is slow.
- Booking status is not transparent.
- Users may depend heavily on brokers.
- There is limited verification of landlords and listings.
- Disputes and complaints are hard to manage.
- Admin-level moderation is missing in informal systems.

## 10. Proposed System

The proposed system, RoomRadar, is a web-based room rental and booking platform where all major rental activities are handled digitally. The system provides a structured interface for travellers, landlords and admins.

Travellers can search rooms, apply filters, view room details, submit booking requests, chat with landlords and track application status. Landlords can create listings, upload room images, manage room availability, respond to inquiries and review applications. Admins can manage users, rooms, reports, verification, support tickets and platform settings.

The proposed system improves the rental process by providing:

- Centralized room listing platform.
- Verified and structured room information.
- Fast search and filtering.
- Role-based portals.
- Real-time chat and inquiry management.
- Booking request tracking.
- Reviews and ratings.
- Admin moderation.
- Secure authentication and protected access.
- Upload validation and cloud image storage.
- AI chatbot support.

## 11. Key Features

### 11.1 Traveller Features

- Register and login securely.
- Browse featured and available rooms.
- Search rooms by location and city.
- Filter rooms by rent, room type, amenities and availability.
- View detailed room information.
- View images, location and landlord details.
- Add rooms to wishlist.
- Send booking requests.
- Track application status.
- Chat with landlords.
- Submit reviews or feedback.
- Raise support tickets.
- Use chatbot assistance for common queries.

### 11.2 Landlord Features

- Register and login as landlord.
- Add new room listings.
- Upload room images.
- Edit room details, rent, amenities and availability.
- View and manage all listed rooms.
- Receive booking applications.
- Approve, reject or review applications.
- Communicate with interested travellers.
- View calendar and booking-related information.
- Access landlord insights and overview.
- Manage profile details.

### 11.3 Admin Features

- Secure admin login.
- View admin dashboard and platform insights.
- Manage users and user details.
- Review and moderate room listings.
- Manage admin permissions.
- Handle verification workflows.
- Review support tickets and complaints.
- Monitor notifications, reports and activity.
- Manage platform settings.
- Support trust and safety operations.

### 11.4 Common Platform Features

- JWT-based authentication.
- Role-based route protection.
- Responsive frontend design.
- Real-time chat using Socket.IO.
- Cloud image upload.
- Notifications.
- Reviews and feedback.
- AI chatbot support.
- Error handling and validation.
- Secure API communication.

## 12. Literature and Technology Review

Online rental marketplace platforms have improved the accessibility of accommodation search by allowing users to browse options digitally. However, many local rental systems still suffer from weak verification, limited filtering, poor communication and unclear booking processes.

Location-based search is important in rental applications because users generally prefer rooms near colleges, offices, transport facilities or known city areas. Search filters improve relevance by allowing users to narrow results according to price, room type, availability, amenities and user preference.

Real-time communication improves user trust because tenants can directly ask questions before making a booking request. Socket-based chat systems are useful for inquiry handling, application updates and landlord-tenant communication.

Role-based access control is important in systems where different users perform different tasks. In RoomRadar, travellers, landlords and admins have separate responsibilities. JWT authentication and protected routes help ensure that users only access the features allowed for their role.

Cloud-based media storage is useful because rental listings depend heavily on room photos. Multer and Cloudinary help manage image upload and storage workflows.

Admin moderation, reviews and support ticket systems improve trust by allowing platform managers to monitor users, verify listings and handle disputes.

## 13. Technology Stack

### 13.1 Frontend Technologies

**React.js:** Used to build the user interface using reusable components.  
**Vite:** Used as the frontend build tool for fast development and optimized builds.  
**Tailwind CSS:** Used for responsive and utility-based styling.  
**React Router:** Used for route management and role-based navigation.  
**Axios:** Used for API communication between frontend and backend.  
**Socket.IO Client:** Used for real-time chat and live updates.  
**Framer Motion:** Used for smooth UI transitions and animations.  
**Leaflet / Map Libraries:** Used for map and location-related room display features.  
**React Query:** Used for efficient data fetching and caching.

### 13.2 Backend Technologies

**Node.js:** Used as the backend runtime environment.  
**Express.js:** Used to build REST APIs and middleware-based backend flow.  
**MongoDB:** Used as the NoSQL database for storing users, rooms, bookings and chats.  
**Mongoose:** Used for schema modeling and database operations.  
**Socket.IO:** Used for real-time communication.  
**JWT:** Used for secure authentication and authorization.  
**bcryptjs:** Used for password hashing.  
**Multer:** Used for handling file upload requests.  
**Cloudinary:** Used for cloud image storage.  
**CORS and Security Headers:** Used for safer API access.  
**Compression:** Used to optimize server responses.

## 14. System Requirements

### 14.1 Hardware Requirements

- Processor: Intel i3 or above.
- RAM: Minimum 4 GB, recommended 8 GB.
- Storage: Minimum 1 GB free space for project files and dependencies.
- Internet connection for cloud services and package installation.

### 14.2 Software Requirements

- Operating System: Windows, Linux or macOS.
- Node.js and npm.
- MongoDB database or MongoDB Atlas.
- Code editor such as Visual Studio Code.
- Web browser such as Chrome, Edge or Firefox.
- Git for version control.

## 15. System Architecture

RoomRadar follows a client-server architecture. The frontend is developed using React and communicates with the backend through REST APIs. The backend is built using Express.js and connects to MongoDB using Mongoose. Real-time chat is handled through Socket.IO. Images are uploaded through backend upload APIs and stored in Cloudinary.

### 15.1 Architecture Flow

```text
User Interface
     |
     v
React + Vite Frontend
     |
     | REST API / Socket Events
     v
Express.js Backend
     |
     | Business Logic and Middleware
     v
MongoDB Database + Cloudinary Storage
     |
     v
Notifications, Chat, Reviews, Support and AI Assistance
```

### 15.2 Layered Architecture

**Presentation Layer:** React pages, layouts, forms, cards, dashboards and responsive UI components.  
**API Layer:** Express routes for authentication, rooms, bookings, chat, admin, search and support.  
**Business Logic Layer:** Controllers and middleware for validation, authorization, booking flow and moderation.  
**Data Layer:** MongoDB models for users, rooms, applications, conversations, messages and support records.  
**Integration Layer:** Socket.IO, Cloudinary, chatbot APIs and notification services.

## 16. Methodology

The development methodology follows a modular full-stack development approach.

### 16.1 Requirement Analysis

The first phase identifies the needs of three user roles: travellers, landlords and admins. Main requirements include search, listing, booking request, chat, verification, support and moderation.

### 16.2 System Design

In this phase, the project architecture, database models, route structure, frontend pages and role-based workflows are designed. The application is divided into modules so that each module can be developed and tested separately.

### 16.3 Frontend Development

The frontend is developed using React.js. Pages are created for home, search, room details, booking, applications, wishlist, landlord dashboard, admin dashboard, inbox and support. Tailwind CSS is used for responsive styling.

### 16.4 Backend Development

The backend is developed using Node.js and Express.js. APIs are created for authentication, rooms, users, applications, conversations, chat, notifications, admin, support, settings and search.

### 16.5 Database Integration

MongoDB is used to store application data. Mongoose schemas define the structure of collections such as users, rooms, applications, messages, conversations, notifications and reviews.

### 16.6 Real-Time Communication

Socket.IO is integrated to allow real-time messaging between users. Online user tracking and message delivery events are handled through socket connections.

### 16.7 Security and Validation

JWT authentication, password hashing, role-based restrictions, upload validation, CORS configuration, request limits and error handling are used to improve platform safety.

### 16.8 Testing and Evaluation

Functional tests are performed for login, search, booking, chat, upload and admin flows. Build checks and server syntax checks are used to verify implementation readiness.

## 17. Module Description

### 17.1 Authentication Module

The authentication module manages user registration, login, password security and session handling. JWT tokens are used for protected API access. Passwords are stored securely using hashing.

### 17.2 User and Role Management Module

This module manages traveller, landlord and admin roles. Each role receives access to specific pages and features. Role restrictions prevent unauthorized access.

### 17.3 Room Listing Module

Landlords can create, update and manage room listings. A room listing contains information such as title, location, rent, room type, images, amenities, availability and owner details.

### 17.4 Search and Discovery Module

Travellers can search rooms based on location, city, rent, room type and other filters. Enhanced search improves result relevance and helps users find suitable rooms quickly.

### 17.5 Room Details Module

This module displays complete information about a selected room, including images, amenities, rent, address, landlord details, reviews and booking options.

### 17.6 Booking and Application Module

Travellers can submit booking requests or applications for rooms. Landlords can review requests and update application status. Users can track the progress of their applications.

### 17.7 Chat and Conversation Module

Socket.IO-based chat allows travellers and landlords to communicate in real time. The module supports inquiry messages, conversation history and live message events.

### 17.8 Review and Feedback Module

Users can provide reviews and feedback for rooms or stay experiences. Reviews help future users make better decisions.

### 17.9 Upload and Media Module

Room images and other uploadable data are handled through backend upload APIs. Multer processes uploaded files and Cloudinary stores media securely in the cloud.

### 17.10 Notification Module

Notifications inform users about important events such as application updates, messages, approvals, rejections and system alerts.

### 17.11 Admin Moderation Module

Admins can manage users, review rooms, monitor reports, handle verification workflows, manage support tickets and maintain platform safety.

### 17.12 Support Ticket Module

Users can raise issues or support requests. Admins can review and respond to support tickets, which helps in dispute handling and platform reliability.

### 17.13 AI Chatbot Module

The chatbot assists users with common queries related to room search, booking, landlord communication and platform usage. It improves user support and reduces manual query handling.

### 17.14 Analytics and Insights Module

Admin and landlord insight pages help monitor platform activity, listing performance, user engagement and application-related data.

## 18. Database Design

The project uses MongoDB collections modeled through Mongoose. Main collections include:

### 18.1 User

Stores user details such as name, email, password hash, phone, role, profile information, verification status and account status.

### 18.2 Room

Stores room listing data such as title, description, address, city, rent, amenities, images, availability, landlord reference, verification status and listing status.

### 18.3 Application

Stores booking or rental application details such as applicant, room, landlord, move-in date, status, remarks and timestamps.

### 18.4 Conversation

Stores chat conversation references between users, room context and last message information.

### 18.5 Message

Stores individual chat messages including sender, receiver, text, conversation reference, message type and timestamp.

### 18.6 Review and GuestReview

Stores user feedback, rating, comments, room references and reviewer information.

### 18.7 Notification

Stores notification messages, type, receiver, read status and related entity information.

### 18.8 Verification

Stores verification-related records for user or listing validation.

### 18.9 SupportTicket

Stores support requests, issue category, user reference, message, status and admin response.

### 18.10 PlatformSetting

Stores configurable platform settings used by admin workflows.

### 18.11 UsageEvent

Stores usage analytics events for activity tracking and insights.

### 18.12 Transaction

Stores transaction-related data for future payment or booking financial workflows.

## 19. API Design Overview

RoomRadar backend exposes REST API routes for different modules:

- `/api/auth` for login, registration and authentication.
- `/api/rooms` for room listing and room detail operations.
- `/api/users` for user profile and user management.
- `/api/applications` for booking request workflows.
- `/api/chat` and `/api/conversations` for messaging.
- `/api/upload` for media upload.
- `/api/reviews` for review workflows.
- `/api/landlords` for landlord-specific features.
- `/api/admin` for admin dashboard and moderation.
- `/api/notifications` for user notifications.
- `/api/search` and `/api/enhanced-search` for room discovery.
- `/api/verification` for verification workflows.
- `/api/support` for support tickets.
- `/api/chatbot` for AI assistant features.
- `/api/settings` for platform settings.
- `/api/usage` and `/api/insights` for analytics.
- `/api/health` for server health status.

## 20. Data Flow

### 20.1 Traveller Room Search Flow

```text
Traveller opens search page
        |
Enters location, budget or filter preferences
        |
Frontend sends API request
        |
Backend searches room collection
        |
Filtered rooms are returned
        |
Traveller views room cards and details
```

### 20.2 Booking Request Flow

```text
Traveller selects room
        |
Submits booking request
        |
Backend validates user and room data
        |
Application record is created
        |
Landlord receives request
        |
Landlord approves, rejects or reviews application
        |
Traveller receives status update
```

### 20.3 Chat Flow

```text
User opens conversation
        |
Message is sent from frontend
        |
Socket.IO event reaches backend
        |
Message is delivered to receiver in real time
        |
Conversation history remains available through APIs
```

### 20.4 Admin Moderation Flow

```text
Admin logs in
        |
Admin opens dashboard
        |
Reviews users, rooms, tickets or reports
        |
Admin takes action
        |
System updates database and notifies affected users
```

## 21. Security Features

Security is an important part of RoomRadar because the platform handles user accounts, room information, communication and uploaded media. Important security measures include:

- JWT-based authentication.
- Password hashing using bcryptjs.
- Role-based access control.
- Protected frontend routes.
- Protected backend middleware.
- CORS configuration for allowed origins.
- Request body size limits.
- Upload validation.
- Error handling middleware.
- Security headers such as content type and referrer policy.
- Admin permission checks.
- Account restriction and moderation support.

## 22. Feasibility Study

### 22.1 Technical Feasibility

The project is technically feasible because it uses widely adopted technologies such as React, Node.js, Express and MongoDB. These technologies support scalable full-stack development and have strong community support.

### 22.2 Economic Feasibility

The project is economically feasible because most tools used are open-source or available with free tiers. Development can be done using standard laptops and free development tools.

### 22.3 Operational Feasibility

The system is operationally feasible because it provides simple role-based interfaces. Travellers can search and apply, landlords can manage listings and admins can moderate the platform through dashboards.

### 22.4 Schedule Feasibility

The project can be completed in phases, including requirement analysis, design, development, testing and documentation. Modular development makes it easier to complete and evaluate within an academic project timeline.

## 23. Testing Strategy

Testing is performed to verify that all major workflows work as expected.

### 23.1 Functional Testing

Functional testing checks whether each module performs its expected operations, such as login, search, room listing, booking request, chat and admin moderation.

### 23.2 Integration Testing

Integration testing verifies communication between frontend, backend, database, upload service and socket service.

### 23.3 UI Testing

UI testing checks whether pages render correctly, forms validate input and navigation works across different user roles.

### 23.4 API Testing

API testing verifies backend endpoints for correct request handling, response format, authentication and error messages.

### 23.5 Security Testing

Security testing checks protected routes, role restrictions, invalid token access, upload restrictions and unauthorized actions.

## 24. Sample Test Cases

| Test Case ID | Test Scenario | Expected Result | Status |
| --- | --- | --- | --- |
| TC-01 | User login with valid credentials | User logs in and redirects according to role | Pass |
| TC-02 | User login with invalid credentials | Error message is displayed | Pass |
| TC-03 | Traveller searches rooms by city | Matching rooms are displayed | Pass |
| TC-04 | Traveller applies filters | Filtered results are shown | Pass |
| TC-05 | Traveller opens room detail page | Room information is displayed | Pass |
| TC-06 | Traveller submits booking request | Application is created | Pass |
| TC-07 | Landlord reviews application | Application status is updated | Pass |
| TC-08 | Chat message is sent | Receiver gets message in real time | Pass |
| TC-09 | Landlord uploads room image | Image is stored and displayed | Pass |
| TC-10 | Admin reviews room listing | Listing status is updated | Pass |
| TC-11 | User raises support ticket | Ticket is created for admin review | Pass |
| TC-12 | Unauthorized user opens protected page | Access is denied or redirected | Pass |

## 25. Expected Outcomes

The expected outcomes of the project are:

- A working full-stack rental platform.
- Separate traveller, landlord and admin portals.
- Search-to-booking workflow.
- Real-time chat and inquiry handling.
- Room listing management.
- Admin moderation and support ticket management.
- Secure login and role-based route protection.
- Upload and media management.
- AI chatbot support.
- Improved rental search transparency and user convenience.

## 26. Advantages

- Reduces dependency on offline brokers.
- Saves time in room search.
- Provides structured and searchable room data.
- Improves tenant-landlord communication.
- Supports transparent booking status.
- Helps landlords manage listings digitally.
- Improves platform trust through admin moderation.
- Provides scalable architecture for future development.

## 27. Limitations

- Real payment gateway integration is not part of the current version.
- Mobile applications are not included in the current scope.
- Listing verification may still require manual admin review.
- AI recommendations are limited and can be improved in future versions.
- Production deployment requires cloud hosting and monitoring setup.
- Accuracy of room location depends on correct data entered by landlord or geocoding support.

## 28. Future Scope

Future enhancements can include:

1. Cloud deployment with production database and monitoring.
2. Real online payment gateway integration.
3. Android and iOS mobile applications.
4. Advanced AI-based room recommendations.
5. Multilingual chatbot support.
6. Automated document verification.
7. Advanced fraud detection.
8. Digital rental agreement signing.
9. Landlord subscription or premium listing plans.
10. Analytics dashboards for demand, pricing and occupancy trends.
11. Map-based room discovery with stronger geolocation support.
12. Push notifications for application and chat updates.

## 29. Project Timeline

| Phase | Work Description | Estimated Duration |
| --- | --- | --- |
| Phase 1 | Requirement analysis and project planning | 1 week |
| Phase 2 | UI design and database planning | 1 week |
| Phase 3 | Authentication and role setup | 1 week |
| Phase 4 | Room listing and search module | 2 weeks |
| Phase 5 | Booking and application workflow | 1 week |
| Phase 6 | Chat, notifications and upload integration | 2 weeks |
| Phase 7 | Admin dashboard and moderation | 2 weeks |
| Phase 8 | Testing, bug fixing and optimization | 1 week |
| Phase 9 | Documentation and presentation | 1 week |

## 30. Conclusion

RoomRadar successfully addresses major problems in the room rental process by providing a centralized, secure and user-friendly web platform. It connects travellers and landlords through structured listings, search filters, booking requests and real-time chat. Admin moderation, verification workflows, support tickets and reviews improve trust and safety.

The project demonstrates the practical use of the MERN stack, real-time communication, cloud media handling, role-based access and AI-assisted support in a real-world rental marketplace scenario. With future enhancements such as payment gateway integration, mobile apps and advanced AI recommendations, RoomRadar can become a complete production-ready rental management platform.

## 31. References

1. React Documentation: https://react.dev/
2. Vite Documentation: https://vitejs.dev/
3. Express.js Documentation: https://expressjs.com/
4. MongoDB Documentation: https://www.mongodb.com/docs/
5. Mongoose Documentation: https://mongoosejs.com/docs/
6. Socket.IO Documentation: https://socket.io/docs/
7. Cloudinary Documentation: https://cloudinary.com/documentation
8. JSON Web Token Documentation: https://jwt.io/
9. OWASP Web Security Guidelines: https://owasp.org/
10. Tailwind CSS Documentation: https://tailwindcss.com/docs
