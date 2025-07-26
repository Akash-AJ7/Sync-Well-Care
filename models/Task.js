import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    taskName: { type: String, required: true },
    taskTime: { type: Date, required: true },
    nomineePhone: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isComplete: { type: Boolean, default: false },
    diseaseName: { 
        type: String, 
        enum: ['Fever', 'Blood Pressure', 'Glucose'], // Limit disease names to these values
    },
    diseaseValue: { 
        type: Number,
        required: function() {
            return this.diseaseName != null; // Only require diseaseValue if diseaseName is provided
        }
    },
    recommendations: { type: String }
});

// Create the Task model
const Task = mongoose.model('Task', taskSchema);

export default Task;
