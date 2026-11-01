const mongoose = require('mongoose');

const subjectMarksSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  subjectType: {
    type: String,
    enum: ['Theory', 'Practical'],
    default: 'Theory'
  },
  // Theory & Practical common components:
  // 1. Minor Exams (Max: 20)
  minorExam: {
    type: Number,
    min: 0,
    max: 20,
    default: null
  },
  // 2. Major Exam (Max: 60)
  majorExam: {
    type: Number,
    min: 0,
    max: 60,
    default: null
  },
  // 3. Test / Quiz (Max: 10)
  testQuiz: {
    type: Number,
    min: 0,
    max: 10,
    default: null
  },
  // 4. Assignment (Max: 10)
  assignment: {
    type: Number,
    min: 0,
    max: 10,
    default: null
  },
  // Practical only component:
  // 5. Practical (Max: 50)
  practical: {
    type: Number,
    min: 0,
    max: 50,
    default: null
  },
  // Derived metrics
  totalMarks: {
    type: Number,
    default: null
  },
  maxMarks: {
    type: Number,
    default: 100 // 100 for Theory, 150 for Practical
  },
  passingMarks: {
    type: Number,
    default: 40 // 40 for Theory, 60 for Practical
  },
  isPassed: {
    type: Boolean,
    default: null
  },
  percentage: {
    type: Number,
    default: null
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  gradedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Auto-calculate total and pass/fail before save
subjectMarksSchema.pre('save', function (next) {
  const isPractical = this.subjectType === 'Practical';
  this.maxMarks = isPractical ? 150 : 100;
  this.passingMarks = isPractical ? 60 : 40;

  // Calculate total if any component is entered
  const minor = this.minorExam !== null && this.minorExam !== undefined ? Number(this.minorExam) : 0;
  const major = this.majorExam !== null && this.majorExam !== undefined ? Number(this.majorExam) : 0;
  const quiz = this.testQuiz !== null && this.testQuiz !== undefined ? Number(this.testQuiz) : 0;
  const asg = this.assignment !== null && this.assignment !== undefined ? Number(this.assignment) : 0;
  const prac = (isPractical && this.practical !== null && this.practical !== undefined) ? Number(this.practical) : 0;

  const hasAnyEntry = (this.minorExam !== null && this.minorExam !== undefined) ||
                       (this.majorExam !== null && this.majorExam !== undefined) ||
                       (this.testQuiz !== null && this.testQuiz !== undefined) ||
                       (this.assignment !== null && this.assignment !== undefined) ||
                       (isPractical && this.practical !== null && this.practical !== undefined);

  if (hasAnyEntry) {
    this.totalMarks = Math.round((minor + major + quiz + asg + prac) * 100) / 100;
    this.percentage = Math.round(((this.totalMarks / this.maxMarks) * 100) * 10) / 10;
    this.isPassed = this.totalMarks >= this.passingMarks;
    this.gradedAt = this.gradedAt || new Date();
  }

  next();
});

subjectMarksSchema.index({ subject: 1, student: 1 }, { unique: true });
subjectMarksSchema.index({ department: 1, semester: 1 });
subjectMarksSchema.index({ student: 1 });

module.exports = mongoose.model('SubjectMarks', subjectMarksSchema);

