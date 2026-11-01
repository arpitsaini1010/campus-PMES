const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference is required']
  },
  type: {
    type: String,
    enum: ['proposal', 'progress', 'final'],
    required: [true, 'Submission type is required']
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  file: {
    name: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    driveFileId: {
      type: String,
      default: null
    },
    data: {
      type: Buffer,
      select: false // Exclude from normal queries for performance per NFR-FIL-02
    }
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  feedback: [{
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

submissionSchema.index({ project: 1, type: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
