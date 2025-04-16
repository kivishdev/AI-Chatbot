const form = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const outputDiv = document.getElementById("image-output");
const descriptionDiv = document.getElementById("description-output");
const loadingSpinner = document.getElementById("loading-spinner");
const loadingText = document.getElementById("loading-text");
const imageUpload = document.getElementById("image-upload");
const previewContainer = document.getElementById("preview-container");
const previewImage = document.getElementById("preview-image");
const uploadPrompt = document.getElementById("upload-prompt");
const clearImageBtn = document.getElementById("clear-image-btn");
const modeIndicator = document.getElementById("mode-indicator");

// Variables to store the uploaded image
let uploadedImage = null;
let uploadedImageType = null;

// Update mode indicator based on image presence
function updateModeIndicator() {
  if (uploadedImage) {
    modeIndicator.innerHTML = `Current Mode: <strong>Edit Uploaded Image</strong>`;
    loadingText.textContent = "✨ Editing your image...";
  } else {
    modeIndicator.innerHTML = `Current Mode: <strong>Generate New Images</strong>`;
    loadingText.textContent = "✨ Generating your AI image...";
  }
}

// Handle image upload
imageUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("File size exceeds 5MB limit. Please choose a smaller file.");
    imageUpload.value = "";
    return;
  }
  
  // Read and preview the image
  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src = event.target.result;
    uploadedImage = event.target.result.split(",")[1]; // Store base64 data without prefix
    uploadedImageType = file.type;
    
    // Show preview and clear button
    previewContainer.style.display = "block";
    uploadPrompt.style.display = "none";
    clearImageBtn.style.display = "block";
    
    // Update mode indicator
    updateModeIndicator();
    
    // Update placeholder text to guide the user
    promptInput.placeholder = "Describe how to edit this image...";
  };
  
  reader.readAsDataURL(file);
});

// Handle drag and drop
const uploadPreview = document.getElementById("upload-preview");
uploadPreview.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadPreview.classList.add("dragover");
});

uploadPreview.addEventListener("dragleave", () => {
  uploadPreview.classList.remove("dragover");
});

uploadPreview.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadPreview.classList.remove("dragover");
  
  if (e.dataTransfer.files.length) {
    imageUpload.files = e.dataTransfer.files;
    // Trigger the change event manually
    const event = new Event("change");
    imageUpload.dispatchEvent(event);
  }
});

// Clear image button
clearImageBtn.addEventListener("click", () => {
  clearUploadedImage();
});

function clearUploadedImage() {
  uploadedImage = null;
  uploadedImageType = null;
  imageUpload.value = "";
  previewImage.src = "";
  previewContainer.style.display = "none";
  uploadPrompt.style.display = "block";
  clearImageBtn.style.display = "none";
  
  // Reset placeholder text
  promptInput.placeholder = "Enter a prompt...";
  
  // Update mode indicator
  updateModeIndicator();
}

// Form submission with image support
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  outputDiv.innerHTML = "";
  descriptionDiv.innerHTML = "";
  showLoading(true);

  try {
    // Prepare the payload with prompt and image (if any)
    const payload = { prompt };
    if (uploadedImage) {
      payload.image = {
        data: uploadedImage,
        mimeType: uploadedImageType
      };
    }

    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    showLoading(false);

    if (data.error === "overloaded") {
      outputDiv.innerHTML = `<p style="color: #ff4444;">⚠️ Model is currently overloaded. Please try again later.</p>`;
      console.error("Model is overloaded");
      return;
    }

    if (data.success) {
      if (data.images && data.images.length > 0) {
        data.images.forEach((img, index) => {
          const container = document.createElement("div");
          container.className = "image-container";
    
          const imageElement = document.createElement("img");
          imageElement.src = `data:${img.mimeType};base64,${img.base64}`;
          imageElement.alt = "Generated image";
    
          const downloadButton = document.createElement("button");
          downloadButton.className = "download-btn";
          downloadButton.innerText = "Download";
          downloadButton.onclick = () => {
            const link = document.createElement("a");
            link.href = imageElement.src;
            link.download = `generated_image_${index}.${img.mimeType.split("/")[1]}`;
            link.click();
          };
    
          container.appendChild(imageElement);
          container.appendChild(downloadButton);
          outputDiv.appendChild(container);
    
          addToPreviousImages(img.base64, img.mimeType);
        });
      }
    
      // ✅ Always show description if present
      if (data.description) {
        const formattedHTML = marked.parse(data.description);
        descriptionDiv.innerHTML = `<strong>Description:</strong><br>${formattedHTML}`;
      }

    } else {
      outputDiv.innerHTML = "<p>❌ No image generated. Try a different prompt.</p>";
    }
    
  } catch (error) {
    showLoading(false);
    outputDiv.innerHTML = `<p style="color: #ff4444;">❌ Error: ${error.message}</p>`;
    console.error("Error:", error);
  }
});

function showLoading(show) {
  loadingSpinner.style.display = show ? "block" : "none";
  loadingText.style.display = show ? "block" : "none";
}

// Add image to previously generated section
function addToPreviousImages(base64, mimeType) {
  const container = document.createElement("div");
  container.className = "previous-image-container";

  const img = document.createElement("img");
  img.src = `data:${mimeType};base64,${base64}`;
  img.alt = "Generated image";

  const removeBtn = document.createElement("button");
  removeBtn.innerText = "Remove";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = () => container.remove();

  container.appendChild(img);
  container.appendChild(removeBtn);

  document.getElementById("previous-images").appendChild(container);
}

// Initialize mode indicator on page load
updateModeIndicator();