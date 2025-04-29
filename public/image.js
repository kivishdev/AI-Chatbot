// Main DOM Elements
const form = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const outputDiv = document.getElementById("image-output");
const descriptionDiv = document.getElementById("description-output");
const loadingState = document.getElementById("loading-state");
const loadingText = document.getElementById("loading-text");
const imageUpload = document.getElementById("image-upload");
const previewContainer = document.getElementById("preview-container");
const previewImage = document.getElementById("preview-image");
const uploadPrompt = document.getElementById("upload-prompt");
const clearImageBtn = document.getElementById("clear-image-btn");
const modeIndicator = document.getElementById("mode-indicator");
const uploadArea = document.getElementById("upload-area");
const uploadPreview = document.getElementById("upload-preview");
const tabBtns = document.querySelectorAll(".tab-btn");
const themeToggle = document.getElementById("theme-toggle");
const clearAllBtn = document.getElementById("clear-all-btn");
const downloadAllBtn = document.getElementById("download-all-btn");

// Variables to store the uploaded image
let uploadedImage = null;
let uploadedImageType = null;
let generatedImages = [];
let activeMode = "create"; // 'create' or 'edit'

// Initialize the application
function initApp() {
  // Check for saved theme preference
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
    themeToggle.querySelector(".toggle-icon").textContent = "☀️";
  }

  // Set up event listeners
  setupEventListeners();
  
  // Update UI state
  updateModeIndicator();
  
  // Add animation to main elements
  animateElements();
}

// Set up all event listeners
function setupEventListeners() {
  // Form submission
  form.addEventListener("submit", handleFormSubmit);
  
  // Image upload
  imageUpload.addEventListener("change", handleImageUpload);
  
  // Drag and drop
  setupDragAndDrop();
  
  // Clear image button
  clearImageBtn.addEventListener("click", clearUploadedImage);
  
  // Tab buttons
  tabBtns.forEach(btn => {
    btn.addEventListener("click", handleTabChange);
  });
  
  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);
  
  // Chips selection
  setupChips();
  
  // Gallery actions
  clearAllBtn.addEventListener("click", clearAllImages);
  downloadAllBtn.addEventListener("click", downloadAllImages);
}

// Add subtle animations to main elements
function animateElements() {
  const elements = [
    document.querySelector(".hero-section"),
    document.querySelector(".workspace-container"),
    document.querySelector(".gallery-section")
  ];
  
  elements.forEach((el, index) => {
    el.style.animation = `fadeIn 0.6s ease-out ${index * 0.2}s both`;
  });
}

// Handle tab changes between create and edit modes
function handleTabChange(e) {
  // Remove active class from all tabs
  tabBtns.forEach(btn => btn.classList.remove("active"));
  
  // Add active class to clicked tab
  e.target.classList.add("active");
  
  // Update active mode
  activeMode = e.target.dataset.tab;
  
  // Toggle visibility of upload area
  if (activeMode === "edit") {
    uploadArea.style.display = "block";
    promptInput.placeholder = "Describe how you want to edit this image...";
  } else {
    if (!uploadedImage) {
      uploadArea.style.display = "none";
    }
    promptInput.placeholder = "Describe what you want to create...";
  }
  
  // Update mode indicator
  updateModeIndicator();
}

// Toggle theme between light and dark
function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  
  // Update toggle icon
  const isDark = document.body.classList.contains("dark-theme");
  themeToggle.querySelector(".toggle-icon").textContent = isDark ? "☀️" : "🌙";
  
  // Save preference to localStorage
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

// Setup chip selection functionality
function setupChips() {
  const chips = document.querySelectorAll(".chip");
  
  chips.forEach(chip => {
    if (chip.textContent === "+ More") {
      chip.addEventListener("click", () => {
        // This would show more style options in a real app
        alert("More style options would appear here!");
      });
    } else {
      chip.addEventListener("click", () => {
        // Add chip text to prompt input
        const currentPrompt = promptInput.value;
        if (currentPrompt) {
          promptInput.value = `${currentPrompt}, ${chip.textContent.toLowerCase()}`;
        } else {
          promptInput.value = chip.textContent.toLowerCase();
        }
        promptInput.focus();
      });
    }
  });
}

// Update the mode indicator based on current state
function updateModeIndicator() {
  const statusIcon = modeIndicator.querySelector(".status-icon");
  const statusText = modeIndicator.querySelector(".status-text");
  
  if (uploadedImage && activeMode === "edit") {
    statusIcon.textContent = "✏️";
    statusIcon.className = "status-icon edit-mode";
    statusText.textContent = "Editing uploaded image with AI";
    loadingText.textContent = "✨ Transforming your image...";
  } else {
    statusIcon.textContent = "🔮";
    statusIcon.className = "status-icon create-mode";
    statusText.textContent = "Creating new image from text";
    loadingText.textContent = "✨ Crafting your vision...";
  }
}

// Setup drag and drop functionality
function setupDragAndDrop() {
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
}

// Handle image upload
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification("File size exceeds 5MB limit", "error");
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
    
    // If in create mode, switch to edit mode
    if (activeMode === "create") {
      // Activate edit tab
      tabBtns.forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.tab === "edit") {
          btn.classList.add("active");
        }
      });
      
      activeMode = "edit";
    }
    
    // Update mode indicator
    updateModeIndicator();
    
    // Update placeholder text to guide the user
    promptInput.placeholder = "Describe how to edit this image...";
    
    // Show upload area if hidden
    uploadArea.style.display = "block";
  };
  
  reader.readAsDataURL(file);
}

// Clear uploaded image
function clearUploadedImage() {
  uploadedImage = null;
  uploadedImageType = null;
  imageUpload.value = "";
  previewImage.src = "";
  previewContainer.style.display = "none";
  uploadPrompt.style.display = "block";
  clearImageBtn.style.display = "none";
  
  // Reset placeholder text
  promptInput.placeholder = activeMode === "create" 
    ? "Describe what you want to create..." 
    : "Describe how you want to edit this image...";
  
  // If in edit mode with no image, hide upload area
  if (activeMode === "create") {
    uploadArea.style.display = "none";
  }
  
  // Update mode indicator
  updateModeIndicator();
}

// Handle form submission (generate/edit image)
async function handleFormSubmit(e) {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) {
    showNotification("Please enter a prompt", "error");
    return;
  }

  // Clear previous results
  outputDiv.innerHTML = "";
  descriptionDiv.innerHTML = "";
  
  // Show loading state
  showLoading(true);

  try {
    // Prepare the payload with prompt and image (if any)
    const payload = { prompt };
    if (uploadedImage && activeMode === "edit") {
      payload.image = {
        data: uploadedImage,
        mimeType: uploadedImageType
      };
    }

    // Send request to backend
    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    showLoading(false);

    // Handle overloaded state
    if (data.error === "overloaded") {
      showNotification("Model is currently overloaded. Please try again later.", "error");
      console.error("Model is overloaded");
      return;
    }

    // Handle successful generation
    if (data.success) {
      if (data.images && data.images.length > 0) {
        renderGeneratedImages(data.images);
      }
    
      // Show description if present
      if (data.description) {
        renderDescription(data.description);
      }
    } else {
      showNotification("No image generated. Try a different prompt.", "warning");
    }
    
  } catch (error) {
    showLoading(false);
    showNotification(`Error: ${error.message}`, "error");
    console.error("Error:", error);
  }
}

// Render generated images to the output div
function renderGeneratedImages(images) {
  images.forEach((img, index) => {
    // Store for later use
    generatedImages.push(img);
    
    // Create image container
    const container = document.createElement("div");
    container.className = "image-item";
    
    // Create image element
    const imageElement = document.createElement("img");
    imageElement.src = `data:${img.mimeType};base64,${img.base64}`;
    imageElement.alt = "Generated image";
    
    // Create action buttons
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "image-actions";
    
    // Download button
    const downloadButton = document.createElement("button");
    downloadButton.className = "image-action-btn";
    downloadButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`;
    downloadButton.onclick = () => downloadImage(img.base64, img.mimeType, index);
    
    // Edit button
    const editButton = document.createElement("button");
    editButton.className = "image-action-btn";
    editButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
    editButton.onclick = () => useAsReference(img.base64, img.mimeType);
    
    // Assemble components
    actionsDiv.appendChild(editButton);
    actionsDiv.appendChild(downloadButton);
    
    container.appendChild(imageElement);
    container.appendChild(actionsDiv);
    outputDiv.appendChild(container);
    
    // Add to gallery
    addToGallery(img.base64, img.mimeType);
  });
  
  // Scroll to results
  outputDiv.scrollIntoView({ behavior: 'smooth' });
}

// Render description with proper formatting
function renderDescription(description) {
  // Use marked library to convert markdown to HTML
  const formattedHTML = marked.parse(description);
  
  descriptionDiv.innerHTML = `
    <h4>Image Description</h4>
    <div class="description-content">
      ${formattedHTML}
    </div>
  `;
}

// Add image to gallery
function addToGallery(base64, mimeType) {
  const container = document.createElement("div");
  container.className = "gallery-item";

  const img = document.createElement("img");
  img.src = `data:${mimeType};base64,${base64}`;
  img.alt = "Generated image";

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "gallery-item-actions";
  
  // Download button
  const downloadBtn = document.createElement("button");
  downloadBtn.className = "gallery-action-btn";
  downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
  downloadBtn.onclick = () => downloadImage(base64, mimeType);
  
  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.className = "gallery-action-btn";
  removeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
  removeBtn.onclick = () => container.remove();
  
  // Edit button
  const editBtn = document.createElement("button");
  editBtn.className = "gallery-action-btn";
  editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
  editBtn.onclick = () => useAsReference(base64, mimeType);
  
  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(downloadBtn);
  actionsDiv.appendChild(removeBtn);

  container.appendChild(img);
  container.appendChild(actionsDiv);

  document.getElementById("previous-images").appendChild(container);
}

// Use image as reference for editing
function useAsReference(base64, mimeType) {
  // Activate edit tab
  tabBtns.forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.tab === "edit") {
      btn.classList.add("active");
    }
  });
  
  activeMode = "edit";
  
  // Set the image as the reference
  previewImage.src = `data:${mimeType};base64,${base64}`;
  uploadedImage = base64;
  uploadedImageType = mimeType;
  
  // Show preview and clear button
  previewContainer.style.display = "block";
  uploadPrompt.style.display = "none";
  clearImageBtn.style.display = "block";
  
  // Show upload area
  uploadArea.style.display = "block";
  
  // Update mode indicator
  updateModeIndicator();
  
  // Update placeholder
  promptInput.placeholder = "Describe how to edit this image...";
  
  // Scroll to top of workspace
  document.querySelector(".workspace").scrollIntoView({ behavior: 'smooth' });
  
  // Focus on prompt input
  promptInput.focus();
}

// Download image helper
function downloadImage(base64, mimeType, index = 0) {
  const link = document.createElement("a");
  link.href = `data:${mimeType};base64,${base64}`;
  link.download = `pixelcraft_${Date.now()}_${index}.${mimeType.split("/")[1]}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Clear all images from gallery
function clearAllImages() {
  if (confirm("Are you sure you want to clear all images?")) {
    document.getElementById("previous-images").innerHTML = "";
  }
}

// Download all images
function downloadAllImages() {
  const gallery = document.getElementById("previous-images");
  const images = gallery.querySelectorAll("img");
  
  if (images.length === 0) {
    showNotification("No images to download", "warning");
    return;
  }
  
  // Download each image with a small delay to avoid browser limitations
  images.forEach((img, index) => {
    setTimeout(() => {
      const src = img.src;
      const mimeType = src.split(":")[1].split(";")[0];
      const base64 = src.split(",")[1];
      downloadImage(base64, mimeType, index);
    }, index * 500);
  });
  
  showNotification(`Downloading ${images.length} images...`, "success");
}

// Show loading state
function showLoading(show) {
  loadingState.style.display = show ? "flex" : "none";
}

// Show notification
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Append to body
  document.body.appendChild(notification);
  
  // Show with animation
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add notification styles
const style = document.createElement("style");
style.textContent = `
  .notification {
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    transform: translateX(120%);
    transition: transform 0.3s ease;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification.success {
    background-color: #34d399;
  }
  
  .notification.error {
    background-color: #ef4444;
  }
  
  .notification.warning {
    background-color: #f59e0b;
  }
  
  .notification.info {
    background-color: #3b82f6;
  }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);