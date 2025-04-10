const form = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const outputDiv = document.getElementById("image-output");
const loadingSpinner = document.getElementById("loading-spinner");
const loadingText = document.getElementById("loading-text");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  outputDiv.innerHTML = "";
  showLoading(true);

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    showLoading(false);

    if (data.error === "overloaded") {
      outputDiv.innerHTML = `<p style="color: #ff4444;">⚠️ Model is currently overloaded. Please try again later.</p>`;
      console.error("Model is overloaded");
      return;
    }

    if (data.success && data.images.length > 0) {
      data.images.forEach((img, index) => {
        const container = document.createElement("div");

        const imageElement = document.createElement("img");
        imageElement.src = `data:${img.mimeType};base64,${img.base64}`;

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

        // Add to previously generated section
        addToPreviousImages(img.base64, img.mimeType);
      });
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

  const removeBtn = document.createElement("button");
  removeBtn.innerText = "Remove";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = () => container.remove();

  container.appendChild(img);
  container.appendChild(removeBtn);

  document.getElementById("previous-images").appendChild(container);
}
