document.addEventListener("DOMContentLoaded", function () {
    const reminderForm = document.getElementById("reminderForm");
    const upcomingTasksList = document.getElementById("upcomingTasksList");
    const messageDiv = document.getElementById("message");

    reminderForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const taskName = document.getElementById("taskName").value;
        const taskTime = document.getElementById("taskTime").value;
        const nomineePhone = document.getElementById("nomineePhone").value;
        const diseaseName = document.getElementById("diseaseName").value;
        const diseaseValue = document.getElementById("diseaseValue").value;

        try {
            const response = await fetch("/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ taskName, taskTime, nomineePhone, diseaseName, diseaseValue }),
            });

            if (response.ok) {
                messageDiv.textContent = "Task and disease info submitted successfully!";
                messageDiv.style.color = "green";
                loadTasks(); // Reload tasks to show the new task
            } else {
                const errorText = await response.text();
                messageDiv.textContent = `Error: ${errorText}`;
                messageDiv.style.color = "red";
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            messageDiv.textContent = "An error occurred while submitting the task and disease info.";
            messageDiv.style.color = "red";
        }
    });

    async function loadTasks() {
        try {
            const response = await fetch("/api/tasks");
            const tasks = await response.json();

            // Clear the upcoming tasks list
            upcomingTasksList.innerHTML = "";

            // Sort tasks by taskTime
            tasks.sort((a, b) => new Date(a.taskTime) - new Date(b.taskTime));

            tasks.forEach((task) => {
                // Add to upcoming tasks
                const upcomingTaskItem = document.createElement("li");
                upcomingTaskItem.textContent = `${task.taskName} - ${new Date(task.taskTime).toLocaleString()} - Disease: ${task.diseaseName || 'N/A'}, Value: ${task.diseaseValue || 'N/A'}`;
                
                const completeButton = document.createElement("button");
                completeButton.textContent = "Complete";
                completeButton.style.marginLeft = "10px";
                completeButton.addEventListener("click", async function () {
                    await completeTask(task._id);
                });

                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Delete";
                deleteButton.style.marginLeft = "10px";
                deleteButton.addEventListener("click", async function () {
                    await deleteTask(task._id);
                });

                const cameraButton = document.createElement("button");
                cameraButton.textContent = "Open Camera";
                cameraButton.style.marginLeft = "10px";
                cameraButton.addEventListener("click", function () {
                    openCameraModal(task._id);
                });

                upcomingTaskItem.appendChild(completeButton);
                upcomingTaskItem.appendChild(deleteButton);
                upcomingTaskItem.appendChild(cameraButton);
                upcomingTasksList.appendChild(upcomingTaskItem);
            });
        } catch (error) {
            console.error("Error loading tasks:", error);
        }
    }

    async function completeTask(taskId) {
        try {
            const response = await fetch(`/tasks/${taskId}/complete`, { method: "POST" });

            if (response.ok) {
                messageDiv.textContent = "Task marked as complete!";
                messageDiv.style.color = "green";
                loadTasks();
            } else {
                messageDiv.textContent = "Failed to mark task as complete.";
                messageDiv.style.color = "red";
            }
        } catch (error) {
            console.error("Error marking task as complete:", error);
            messageDiv.textContent = "An error occurred while marking the task as complete.";
            messageDiv.style.color = "red";
        }
    }

    async function deleteTask(taskId) {
        try {
            const response = await fetch(`/tasks/${taskId}`, { method: "DELETE" });

            if (response.ok) {
                messageDiv.textContent = "Task deleted successfully!";
                messageDiv.style.color = "green";
                loadTasks();
            } else {
                messageDiv.textContent = "Failed to delete task.";
                messageDiv.style.color = "red";
            }
        } catch (error) {
            console.error("Error deleting task:", error);
            messageDiv.textContent = "An error occurred while deleting the task.";
            messageDiv.style.color = "red";
        }
    }

    // Camera Modal and Access Function
    const videoModal = document.getElementById("videoModal");
    const videoPreview = document.getElementById("videoPreview");
    const startRecordingButton = document.getElementById("startRecording");
    const stopRecordingButton = document.getElementById("stopRecording");
    const closeModalButton = document.getElementById("closeModal");
    let mediaStream = null;

    function openCameraModal(taskId) {
        videoModal.style.display = "block";
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                mediaStream = stream;
                videoPreview.srcObject = stream;
            })
            .catch(error => {
                console.error("Error accessing camera:", error);
                alert("Unable to access the camera. Please check your browser settings.");
            });
    }

    closeModalButton.addEventListener("click", function () {
        videoModal.style.display = "none";
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
    });

    loadTasks(); // Load tasks initially
});

const diseaseAdviceMapping = {
    "Diabetes": {
        "normal": {
            "diet": "Maintain a balanced diet rich in fiber, whole grains, and lean proteins.",
            "food": "Consume vegetables, fruits, beans, and nuts.",
            "lifestyle": "Engage in regular physical activity and monitor blood sugar levels regularly."
        },
        "high": {
            "diet": "Limit carbohydrate intake, avoid sugary drinks, and choose low glycemic index foods.",
            "food": "Focus on lean proteins, non-starchy vegetables, and healthy fats.",
            "lifestyle": "Maintain a balanced diet, exercise regularly, and take prescribed medications."
        },
        "low": {
            "diet": "Increase carbohydrate intake slightly to stabilize blood sugar levels.",
            "food": "Consume fruits like apples and bananas, and whole grains.",
            "lifestyle": "Monitor blood sugar levels frequently and adjust medication as necessary under a doctor’s guidance."
        }
    },
    "Hypertension": {
        "low": {
            "diet": "Maintain a diet rich in potassium, magnesium, and fiber.",
            "food": "Eat bananas, spinach, and whole grains.",
            "lifestyle": "Practice stress-reducing techniques like yoga and meditation."
        },
        "high": {
            "diet": "Reduce salt intake, avoid processed foods, and increase fruit and vegetable consumption.",
            "food": "Include leafy greens, berries, and fatty fish.",
            "lifestyle": "Regular aerobic exercise and monitor blood pressure levels."
        }
    },
    "Fever": {
        "low": {
            "diet": "Stay hydrated and eat light, easily digestible foods.",
            "food": "Consume soups, broths, and herbal teas.",
            "lifestyle": "Get plenty of rest and avoid strenuous activities."
        },
        "high": {
            "diet": "Stay hydrated, consume cooling foods, and avoid heavy, greasy meals.",
            "food": "Include water, fresh fruit juices, and salads.",
            "lifestyle": "Rest is crucial, take fever-reducing medications as prescribed."
        }
    },
    "Blood Pressure": {
        "normal": {
            "diet": "Maintain a balanced diet with moderate salt intake.",
            "food": "Include fruits, vegetables, and lean proteins.",
            "lifestyle": "Engage in regular physical activity and monitor blood pressure levels."
        },
        "high": {
            "diet": "Reduce salt intake, avoid processed foods, and increase fruit and vegetable consumption.",
            "food": "Include leafy greens, berries, and fatty fish.",
            "lifestyle": "Regular aerobic exercise and monitor blood pressure levels."
        },
        "low": {
            "diet": "Increase salt intake slightly, consume more fluids.",
            "food": "Eat salty foods like olives and soups.",
            "lifestyle": "Stay hydrated, avoid standing for long periods."
        }
    },
    "Sugar": {
        "normal": {
            "diet": "Maintain a balanced diet rich in fiber, whole grains, and lean proteins.",
            "food": "Consume vegetables, fruits, beans, and nuts.",
            "lifestyle": "Engage in regular physical activity and monitor sugar levels regularly."
        },
        "high": {
            "diet": "Limit carbohydrate intake, avoid sugary drinks, and choose low glycemic index foods.",
            "food": "Focus on lean proteins, non-starchy vegetables, and healthy fats.",
            "lifestyle": "Maintain a balanced diet, exercise regularly, and take prescribed medications."
        },
        "low": {
            "diet": "Increase carbohydrate intake slightly to stabilize sugar levels.",
            "food": "Consume fruits like apples and bananas, and whole grains.",
            "lifestyle": "Monitor sugar levels frequently and adjust medication as necessary under a doctor’s guidance."
        }
    }
    // Add more mappings as needed
};


function getAdvice() {
    const diseaseName = document.getElementById("diseaseName").value;
    const diseaseValue = parseFloat(document.getElementById("diseaseValue").value); // Convert to float for better precision

    let adviceCategory;
    if (diseaseName.toLowerCase() === "diabetes") {
        if (diseaseValue < 70) {
            adviceCategory = "low";
        } else if (diseaseValue > 180) {
            adviceCategory = "high";
        } else {
            adviceCategory = "normal";
        }
    } else if (diseaseName.toLowerCase() === "hypertension") {
        if (diseaseValue < 120) {
            adviceCategory = "low";
        } else if (diseaseValue > 140) {
            adviceCategory = "high";
        } else {
            adviceCategory = "normal";
        }
    } else if (diseaseName.toLowerCase() === "fever") {
        if (diseaseValue < 37.5) {
            adviceCategory = "low";
        } else if (diseaseValue > 38.5) {
            adviceCategory = "high";
        } else {
            adviceCategory = "normal";
        }
    } else if (diseaseName.toLowerCase() === "blood pressure") {
        if (diseaseValue < 90) {
            adviceCategory = "low";
        } else if (diseaseValue > 140) {
            adviceCategory = "high";
        } else {
            adviceCategory = "normal";
        }
    } else if (diseaseName.toLowerCase() === "sugar") {
        if (diseaseValue < 70) {
            adviceCategory = "low";
        } else if (diseaseValue > 140) {
            adviceCategory = "high";
        } else {
            adviceCategory = "normal";
        }
    }

    const advice = diseaseAdviceMapping[diseaseName] ? diseaseAdviceMapping[diseaseName][adviceCategory] : null;

    if (advice) {
        document.getElementById("dietAdvice").textContent = `Diet: ${advice.diet}`;
        document.getElementById("foodAdvice").textContent = `Food: ${advice.food}`;
        document.getElementById("lifestyleAdvice").textContent = `Lifestyle: ${advice.lifestyle}`;
    } else {
        document.getElementById("dietAdvice").textContent = "No specific diet advice available.";
        document.getElementById("foodAdvice").textContent = "No specific food advice available.";
        document.getElementById("lifestyleAdvice").textContent = "No specific lifestyle advice available.";
    }
}
