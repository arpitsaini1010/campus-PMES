const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    trim: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required']
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Faculty author is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  maxMarks: {
    type: Number,
    required: [true, 'Maximum marks is required'],
    min: [1, 'Maximum marks must be greater than zero']
  },
  type: {
    type: String,
    enum: ['assignment', 'project'],
    default: 'assignment'
  },
  file: {
    name: { type: String, default: null },
    contentType: { type: String, default: null },
    size: { type: Number, default: 0 },
    driveFileId: { type: String, default: null },
    data: { type: Buffer, select: false }
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  }
}, {
  timestamps: true
});

assignmentSchema.index({ department: 1, semester: 1 });
assignmentSchema.index({ postedBy: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
