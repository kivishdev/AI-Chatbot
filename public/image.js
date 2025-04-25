const form = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const outputDiv = document.getElementById("image-output");
const descriptionDiv = document.getElementById("description-output");
const loadingSpinner = document.getElementById("loading-spinner");
const loadingText = document.getElementById("loading-text");
const imageUpload = document.getElementById("image-upload");
const previewContainer = document.getElementById("preview-container");
const uploadPrompt = document.getElementById("upload-prompt");
const clearImageBtn = document.getElementById("clear-image-btn");
const modeIndicator = document.getElementById("mode-indicator");
const addMoreImagesBtn = document.getElementById("add-more-images");
const modalContainer = document.getElementById("image-modal-container");
const modalImage = document.getElementById("modal-image");
const closeModalBtn = document.getElementById("close-modal");

// Array to store multiple uploaded images
let uploadedImages = [];
const MAX_UPLOADS = 4; // Maximum number of images that can be uploaded at once

// Update mode indicator based on image presence
function updateModeIndicator() {
  if (uploadedImages.length > 0) {
    modeIndicator.innerHTML = `Current Mode: <strong>Edit ${uploadedImages.length} Uploaded Image${uploadedImages.length > 1 ? 's' : ''}</strong>`;
    loadingText.textContent = "✨ Editing your images...";
    // Show add more button when we have at least one image but not max
    addMoreImagesBtn.style.display = uploadedImages.length < MAX_UPLOADS ? "block" : "none";
  } else {
    modeIndicator.innerHTML = `Current Mode: <strong>Generate New Images</strong>`;
    loadingText.textContent = "✨ Generating your AI image...";
    addMoreImagesBtn.style.display = "none";
  }
}

// Handle image upload
imageUpload.addEventListener("change", (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  // Check if adding these files would exceed the maximum
  if (uploadedImages.length + files.length > MAX_UPLOADS) {
    alert(`You can only upload up to ${MAX_UPLOADS} images at once. Please remove some images first.`);
    return;
  }

  processFiles(files);
});

function processFiles(files) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(`File "${file.name}" exceeds 5MB limit. Skipping this file.`);
      continue;
    }
    
    // Read and process the image
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = {
        data: event.target.result.split(",")[1], // Store base64 data without prefix
        mimeType: file.type,
        filename: file.name,
        fullData: event.target.result // Keep the full data URL for preview
      };
      
      uploadedImages.push(imageData);
      updateImagePreviews();
      
      // Show clear button
      clearImageBtn.style.display = "block";
      
      // Update mode indicator
      updateModeIndicator();
      
      // Update placeholder text to guide the user
      promptInput.placeholder = "Describe how to edit these images...";
    };
    
    reader.readAsDataURL(file);
  }
}

// Open image modal preview
function openImagePreview(imageUrl) {
  modalImage.src = imageUrl;
  modalContainer.style.display = "flex";
  document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
}

// Close image modal preview
closeModalBtn.addEventListener("click", () => {
  modalContainer.style.display = "none";
  document.body.style.overflow = "auto"; // Restore scrolling
});

// Close modal when clicking outside the image
modalContainer.addEventListener("click", (e) => {
  if (e.target === modalContainer) {
    modalContainer.style.display = "none";
    document.body.style.overflow = "auto";
  }
});

// Update the preview container with all uploaded images
function updateImagePreviews() {
  // Clear preview container first
  previewContainer.innerHTML = '';
  
  if (uploadedImages.length === 0) {
    previewContainer.style.display = "none";
    uploadPrompt.style.display = "block";
    return;
  }
  
  // Show preview container and hide upload prompt
  previewContainer.style.display = "flex";
  uploadPrompt.style.display = "none";
  
  // Create preview for each image
  uploadedImages.forEach((image, index) => {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'preview-image-wrapper';
    
    const img = document.createElement('img');
    img.src = image.fullData;
    img.className = 'preview-thumbnail';
    img.alt = `Image ${index + 1}`;
    img.onclick = () => openImagePreview(image.fullData);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image-btn';
    removeBtn.innerHTML = '✖';
    removeBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent opening preview when clicking remove
      removeImage(index);
    };
    
    imgWrapper.appendChild(img);
    imgWrapper.appendChild(removeBtn);
    previewContainer.appendChild(imgWrapper);
  });
  
  // Add counter if we have multiple images
  if (uploadedImages.length > 1) {
    const counter = document.createElement('div');
    counter.className = 'image-counter';
    counter.textContent = `${uploadedImages.length} images selected`;
    previewContainer.appendChild(counter);
  }
}

// Remove a specific image
function removeImage(index) {
  uploadedImages.splice(index, 1);
  updateImagePreviews();
  updateModeIndicator();
  
  // Hide clear button if no images
  if (uploadedImages.length === 0) {
    clearImageBtn.style.display = "none";
    promptInput.placeholder = "Enter a prompt...";
  }
}

// Add more images button
addMoreImagesBtn.addEventListener("click", () => {
  // Simply trigger the file input dialog
  imageUpload.click();
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
    processFiles(e.dataTransfer.files);
  }
});

// Clear all images button
clearImageBtn.addEventListener("click", () => {
  clearUploadedImages();
});

function clearUploadedImages() {
  uploadedImages = [];
  imageUpload.value = "";
  updateImagePreviews();
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
    // Process each uploaded image or generate a new one if no uploads
    if (uploadedImages.length > 0) {
      // Create an array of promises for parallel processing
      const processPromises = uploadedImages.map(image => {
        const payload = { 
          prompt,
          image: {
            data: image.data,
            mimeType: image.mimeType
          }
        };
        
        return fetch("/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        .then(response => response.json());
      });
      
      // Wait for all image processing to complete
      const results = await Promise.all(processPromises);
      showLoading(false);
      
      // Process all results
      results.forEach((data, index) => {
        processImageResult(data, index);
      });
      
    } else {
      // Normal single image generation
      const payload = { prompt };
      
      const response = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      showLoading(false);
      processImageResult(data);
    }
  } catch (error) {
    showLoading(false);
    outputDiv.innerHTML += `<p style="color: #ff4444;">❌ Error: ${error.message}</p>`;
    console.error("Error:", error);
  }
});

function processImageResult(data, index) {
  if (data.error === "overloaded") {
    outputDiv.innerHTML += `<p style="color: #ff4444;">⚠️ Model is currently overloaded. Please try again later.</p>`;
    console.error("Model is overloaded");
    return;
  }

  if (data.success) {
    if (data.images && data.images.length > 0) {
      data.images.forEach((img, imgIndex) => {
        const container = document.createElement("div");
        container.className = "image-container";
  
        const imageElement = document.createElement("img");
        imageElement.src = `data:${img.mimeType};base64,${img.base64}`;
        imageElement.alt = "Generated image";
        imageElement.onclick = () => openImagePreview(imageElement.src);
  
        const downloadButton = document.createElement("button");
        downloadButton.className = "download-btn";
        downloadButton.innerText = "Download";
        downloadButton.onclick = (e) => {
          e.stopPropagation(); // Prevent opening preview when clicking download
          const link = document.createElement("a");
          link.href = imageElement.src;
          link.download = `generated_image_${index !== undefined ? index + '_' : ''}${imgIndex}.${img.mimeType.split("/")[1]}`;
          link.click();
        };
  
        container.appendChild(imageElement);
        container.appendChild(downloadButton);
        outputDiv.appendChild(container);
  
        addToPreviousImages(img.base64, img.mimeType);
      });
    }
  
    // Show description if present
    if (data.description && index === undefined) {
      // Only show description for single image generation or first image in batch
      const formattedHTML = marked.parse(data.description);
      descriptionDiv.innerHTML = `<strong>Description:</strong><br>${formattedHTML}`;
    }     
  } else {
    outputDiv.innerHTML += "<p>❌ No image generated. Try a different prompt.</p>";
  }
}

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
  img.onclick = () => openImagePreview(img.src);

  const downloadBtn = document.createElement("button");
  downloadBtn.innerText = "Download";
  downloadBtn.className = "download-btn";
  downloadBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent opening preview when clicking download
    const link = document.createElement("a");
    link.href = img.src;
    link.download = `previous_image_${Date.now()}.${mimeType.split("/")[1]}`;
    link.click();
  };
  
  const removeBtn = document.createElement("button");
  removeBtn.innerText = "Remove";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent opening preview when clicking remove
    container.remove();
  };

  container.appendChild(img);
  container.appendChild(downloadBtn);
  container.appendChild(removeBtn);

  document.getElementById("previous-images").appendChild(container);
}

// Initialize mode indicator on page load
updateModeIndicator();