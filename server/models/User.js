const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  // Split name fields for detailed student / faculty profile
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Male'
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  dob: {
    type: Date,
    default: null
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  personalEmail: {
    type: String,
    lowercase: true,
    trim: true,
    default: null
  },
  universityEmail: {
    type: String,
    lowercase: true,
    trim: true,
    default: null
  },
  email: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true,
    trim: true,
    default: null
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },

  // Student specific (FR-STU-01) - Enrollment Number is Primary Key
  enrollmentNo: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  semester: {
    type: Number,
    min: 1,
    max: 12,
    default: null
  },
  program: {
    type: String,
    trim: true,
    default: null
  },
  batch: {
    type: String,
    trim: true,
    default: null
  },
  section: {
    type: String,
    trim: true,
    default: null
  },

  // Faculty specific (FR-ADM-01)
  employeeId: {
    type: String,
    trim: true,
    sparse: true
  },
  designation: {
    type: String,
    trim: true,
    default: 'Assistant Professor'
  },
  specialization: {
    type: String,
    trim: true,
    default: 'Computer Science'
  },
  maxProjects: {
    type: Number,
    default: 5
  },
  isHod: {
    type: Boolean,
    default: false
  },

  // Department reference (FR-DEP-01, Section 5.1)
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  // Legacy / string backup representation if needed
  departmentName: {
    type: String,
    trim: true,
    default: ''
  },

  mustChangePassword: {
    type: Boolean,
    default: false
  },
  temporaryPassword: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Safe profile object (never return password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
