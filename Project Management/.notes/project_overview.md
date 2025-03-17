# ShanSong Project Overview

## Purpose of This Document
This document provides a high-level overview of the ShanSong project, its goals, architecture, and key components. It serves as an "elevator pitch" that helps both team members and AI assistants quickly understand what the project is about and why it exists. Reference this document whenever you need to align your work with the project's overall vision.

## Project Description
ShanSong is an Instant Delivery Platform designed to connect customers with delivery riders for fast, efficient local deliveries. The platform facilitates the entire delivery process from order creation to completion, with real-time tracking and updates.

## Core Business Functions
1. **Order Creation & Management**: Customers can create delivery orders with sender/receiver information, item details, and special requirements
2. **File Attachment System**: Support for uploading images and documents related to deliveries
3. **Real-Time Order Tracking**: Live updates on order status throughout the delivery process
4. **Rider Assignment System**: Automatic matching of orders with available delivery personnel
5. **Price & Time Estimation**: Calculation of delivery costs and estimated delivery times
6. **Order Data Backup**: Redundant storage of order information for business continuity
7. **Payment API & Status Tracking**: Processing and monitoring of payment transactions
8. **Static Content Delivery**: Serving the website's user interface and static assets

## Technical Architecture
- **Backend**: Node.js with Express.js
- **Database**: Primary storage in Supabase with optional Airtable backup
- **File Storage**: Supabase Storage for file attachments
- **Real-time Communication**: WebSocket for live updates
- **Deployment**: Vercel for hosting and deployment

## Current Status
The project is partially implemented with some core functions complete and others still in development. Refer to `Project Management/Status Management/Status.md` for the current status of each component.

## How to Use This Document
- **For New Team Members**: Read this document first to understand the project's purpose and structure
- **For Feature Development**: Ensure new features align with the core business functions listed here
- **For AI Assistance**: Reference this document to provide context when requesting AI help
- **For Project Planning**: Use this as a foundation for roadmap discussions and prioritization

*Note: This document should be updated whenever there are significant changes to the project's goals or architecture.* 