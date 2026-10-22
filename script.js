const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const results = document.getElementById("results");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const resultCount = document.getElementById("result-count");
const emptyHeading = emptyState.querySelector("h3");
const emptyDescription = emptyState.querySelector("p");
let activeSearchController = null;

function setEmptyState(heading, description) {
  emptyHeading.textContent = heading;
  emptyDescription.textContent = description;
  emptyState.hidden = false;
}

function createImageCard(page) {
  const imageInfo = page.imageinfo[0];
  const title = page.title.replace(/^File:/, "").replace(/_/g, " ");
  const card = document.createElement("a");
  card.className = "image-card";
  card.href = imageInfo.descriptionurl || imageInfo.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.setAttribute("aria-label", `Open ${title} on Wikimedia Commons`);

  const image = document.createElement("img");
  image.src = imageInfo.thumburl || imageInfo.url;
  image.alt = title;
  image.loading = "lazy";

  const caption = document.createElement("span");
  caption.className = "image-card-caption";
  caption.textContent = title;

  card.appendChild(image);
  card.appendChild(caption);
  return card;
}

async function searchImages(query, signal) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query" +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    "&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url" +
    "&iiurlwidth=700&format=json&origin=*";

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Wikimedia Commons returned ${response.status}.`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages ?? {});
  const imagePages = pages.filter((page) => page.imageinfo?.[0]?.url);

  for (const page of imagePages) {
    results.appendChild(createImageCard(page));
  }

  return imagePages.length;
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = searchInput.value.trim();
  if (!query) {
    return;
  }

  activeSearchController?.abort();
  const controller = new AbortController();
  activeSearchController = controller;
  results.innerHTML = "";
  resultCount.textContent = "";
  emptyState.hidden = true;
  loadingState.hidden = false;
  results.setAttribute("aria-busy", "true");

  try {
    const count = await searchImages(query, controller.signal);
    if (activeSearchController !== controller) {
      return;
    }

    resultCount.textContent = `Showing ${count} ${count === 1 ? "result" : "results"} for “${query}”.`;

    if (count === 0) {
      setEmptyState("No images found this time.", "Try another topic or one of the suggestions above.");
    }
  } catch (error) {
    if (error.name === "AbortError" || activeSearchController !== controller) {
      return;
    }

    console.error("Image search failed.", error);
    resultCount.textContent = "The image search could not be completed. Please try again.";
    setEmptyState("We couldn't find your view.", "Check your connection and try searching again.");
  } finally {
    if (activeSearchController === controller) {
      activeSearchController = null;
      loadingState.hidden = true;
      results.removeAttribute("aria-busy");
    }
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    searchInput.value = chip.textContent.trim();
    searchForm.requestSubmit();
  });
});
