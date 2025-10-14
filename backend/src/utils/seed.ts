import mongoose from 'mongoose';
import Organization from '../models/Organization';
import Event from '../models/Event';
import User from '../models/User';
import Student from '../models/Student';

const seedDatabase = async () => {
  try {
    // Connect to database
    const mongoose = require('mongoose');
    const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneau_platform';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to database');

    console.log('🗑️  Clearing existing database data...');

    // Clear existing data
    await Organization.deleteMany({});
    await Event.deleteMany({});
    await User.deleteMany({});
    await Student.deleteMany({});

    console.log('✅ Database cleared');
    console.log('🌱 Starting database seeding...');

    // Seed Organizations
    const organizations = [
      {
        id: 1,
        name: 'AUSO',
        type: 'Student Government',
        description: 'Assumption University Student Organization - Leading student governance and welfare initiatives.',
        followers: 0, // Start with 0 followers
        founded: '2008',
        email: 'auso@au.edu',
        website: 'https://auso.au.edu',
        president: 'Sarah Johnson',
        status: 'active',
        members: 500,
        created: new Date('2024-08-15'),
        socialMedia: {
          facebook: 'https://facebook.com/auso',
          instagram: '@auso_official',
          twitter: '@auso'
        }
      },
      {
        id: 2,
        name: 'AUMSC',
        type: 'Medical Society',
        description: 'AU Medical Student Council - Promoting excellence in medical education and community health.',
        followers: 0, // Start with 0 followers
        founded: '2010',
        email: 'aumsc@au.edu',
        website: 'https://aumsc.au.edu',
        president: 'Dr. Mike Chen',
        status: 'active',
        members: 200,
        created: new Date('2024-09-01'),
        socialMedia: {
          facebook: 'https://facebook.com/aumsc',
          instagram: '@aumsc_official'
        }
      },
      {
        id: 3,
        name: 'AIESEC',
        type: 'International Exchange',
        description: 'AIESEC AU - Global leadership development through international exchange programs.',
        followers: 0, // Start with 0 followers
        founded: '2012',
        email: 'aiesec@au.edu',
        website: 'https://aiesec.au.edu',
        president: 'Alex Wong',
        status: 'active',
        members: 150,
        created: new Date('2024-09-15'),
        socialMedia: {
          facebook: 'https://facebook.com/aiesec.au',
          instagram: '@aiesec_au'
        }
      }
    ];

    await Organization.insertMany(organizations);
    console.log('✅ Organizations seeded');

    // Seed Events
    const events = [
      {
        id: 1,
        title: 'Welcome Week 2024',
        date: '2024-09-20',
        startTime: '09:00',
        endTime: '17:00',
        orgId: 1,
        orgName: 'AUSO',
        type: 'Orientation',
        location: 'Main Campus',
        venue: 'Student Center',
        description: 'Welcome event for new students with activities, games, and networking opportunities.',
        organizer: 'AUSO',
        partner: 'Student Affairs',
        responsiblePerson: 'John Doe',
        responsibleEmail: 'john@au.edu',
        responsiblePhone: '+66-123-4567',
        capacity: 500,
        registered: 250,
        status: 'active',
        participants: [],
        media: []
      },
      {
        id: 2,
        title: 'Medical Career Fair',
        date: '2024-09-25',
        startTime: '10:00',
        endTime: '16:00',
        orgId: 2,
        orgName: 'AUMSC',
        type: 'Career',
        location: 'Medical Building',
        venue: 'Auditorium',
        description: 'Connect with healthcare professionals and learn about career opportunities in medicine.',
        organizer: 'AUMSC',
        partner: 'Career Services',
        responsiblePerson: 'Dr. Jane Smith',
        responsibleEmail: 'jane@au.edu',
        responsiblePhone: '+66-234-5678',
        capacity: 200,
        registered: 120,
        status: 'active',
        participants: [],
        media: []
      },
      {
        id: 3,
        title: 'International Exchange Info Session',
        date: '2024-09-30',
        startTime: '14:00',
        endTime: '16:00',
        orgId: 3,
        orgName: 'AIESEC',
        type: 'Information',
        location: 'International Center',
        venue: 'Conference Room',
        description: 'Learn about international exchange opportunities and global leadership programs.',
        organizer: 'AIESEC',
        partner: 'International Office',
        responsiblePerson: 'Maria Garcia',
        responsibleEmail: 'maria@au.edu',
        responsiblePhone: '+66-345-6789',
        capacity: 100,
        registered: 45,
        status: 'active',
        participants: [],
        media: []
      }
    ];

    await Event.insertMany(events);
    console.log('✅ Events seeded');

    // Seed Users (for testing)
    const users = [
      {
        email: 'student@au.edu',
        password: 'password', // This will be hashed by the pre-save middleware
        name: 'John Doe',
        role: 'student',
        faculty: 'Computer Science',
        studentId: '123456',
        status: 'active',
        joined: new Date('2024-08-15'),
        followedOrgs: [], // Start with no follows
        joinedEvents: [],
        badges: []
      },
      {
        email: 'org@au.edu',
        password: 'password',
        name: 'AUSO President',
        role: 'organization',
        orgId: 1,
        orgType: 'Student Government',
        status: 'active',
        joined: new Date('2024-08-15'),
        followedOrgs: [],
        joinedEvents: [],
        badges: []
      },
      {
        email: 'admin@au.edu',
        password: 'password',
        name: 'Site Admin',
        role: 'admin',
        status: 'active',
        joined: new Date('2024-08-01'),
        followedOrgs: [],
        joinedEvents: [],
        badges: []
      }
    ];

    // Hash passwords before inserting
    for (const user of users) {
      const userDoc = new User(user);
      await userDoc.save();
    }

    console.log('✅ Users seeded');

    // Seed Students
    const students = [
      {
        id: 1,
        email: 'john.doe@au.edu',
        password: 'password',
        name: 'John Doe',
        faculty: 'Computer Science',
        studentId: 'CS2024001',
        status: 'active',
        joined: new Date('2024-08-15'),
        followedOrgs: [], // Start with no follows
        joinedEvents: [],
        badges: []
      },
      {
        id: 2,
        email: 'jane.smith@au.edu',
        password: 'password',
        name: 'Jane Smith',
        faculty: 'Business Administration',
        studentId: 'BA2024002',
        status: 'active',
        joined: new Date('2024-08-20'),
        followedOrgs: [], // Start with no follows
        joinedEvents: [],
        badges: []
      },
      {
        id: 3,
        email: 'mike.johnson@au.edu',
        password: 'password',
        name: 'Mike Johnson',
        faculty: 'Engineering',
        studentId: 'EN2024003',
        status: 'active',
        joined: new Date('2024-09-01'),
        followedOrgs: [], // Start with no follows
        joinedEvents: [],
        badges: []
      },
      {
        id: 4,
        email: 'sarah.wilson@au.edu',
        password: 'password',
        name: 'Sarah Wilson',
        faculty: 'Medicine',
        studentId: 'MD2024004',
        status: 'active',
        joined: new Date('2024-09-05'),
        followedOrgs: [], // Start with no follows
        joinedEvents: [],
        badges: []
      },
      {
        id: 5,
        email: 'alex.brown@au.edu',
        password: 'password',
        name: 'Alex Brown',
        faculty: 'Law',
        studentId: 'LW2024005',
        status: 'active',
        joined: new Date('2024-09-10'),
        followedOrgs: [], // Start with no follows
        joinedEvents: [],
        badges: []
      }
    ];

    // Hash passwords before inserting students
    for (const student of students) {
      const studentDoc = new Student(student);
      await studentDoc.save();
    }

    console.log('✅ Students seeded');
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

export default seedDatabase;