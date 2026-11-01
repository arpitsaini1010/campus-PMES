const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  marks: {
    report: {
      type: Number,
      required: true,
      min: [0, 'Report marks cannot be less than 0'],
      max: [30, 'Report marks cannot exceed 30']
    },
    implementation: {
      type: Number,
      required: true,
      min: [0, 'Implementation marks cannot be less than 0'],
      max: [40, 'Implementation marks cannot exceed 40']
    },
    presentation: {
      type: Number,
      required: true,
      min: [0, 'Presentation marks cannot be less than 0'],
      max: [20, 'Presentation marks cannot exceed 20']
    },
    viva: {
      type: Number,
      required: true,
      min: [0, 'Viva marks cannot be less than 0'],
      max: [10, 'Viva marks cannot exceed 10']
    }
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total marks cannot be less than 0'],
    max: [100, 'Total marks cannot exceed 100']
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save calculation of total to guarantee server calculation
evaluationSchema.pre('validate', function (next) {
  if (this.marks) {
    const report = Number(this.marks.report) || 0;
    const implementation = Number(this.marks.implementation) || 0;
    const presentation = Number(this.marks.presentation) || 0;
    const viva = Number(this.marks.viva) || 0;
    this.total = report + implementation + presentation + viva;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Evaluation', evaluationSchema);
