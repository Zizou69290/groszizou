const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const title = document.getElementById("top-title");
const category = document.getElementById("top-category");
const subtitle = document.getElementById("top-subtitle");
const year = document.getElementById("top-year");
const list = document.getElementById("top-items");

async function loadTop() {
  if (!id) {
    window.location.href = "tops.html";
    return;
  }

  let top;
  try {
    top = await window.ReviewsStore.getTopById(id);
  } catch {
    window.location.href = "tops.html";
    return;
  }

  document.title = `Top - ${top.title || "Sans titre"}`;
  title.textContent = top.title || "Sans titre";
  category.textContent = window.ReviewsStore.categories[top.category] || top.category || "Autre";
  subtitle.textContent = top.subtitle || "";
  year.textContent = top.year ? `Période : ${top.year}` : "";

  list.innerHTML = "";
  (top.items || []).forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "top-item";

    const h = document.createElement("h3");
    h.textContent = `${index + 1}. ${item.title}`;
    li.appendChild(h);

    if (item.comment) {
      const p = document.createElement("p");
      p.textContent = item.comment;
      li.appendChild(p);
    }

    list.appendChild(li);
  });

  if (!list.innerHTML) {
    list.innerHTML = "<li class='top-item'><p>Aucun item.</p></li>";
  }
}

loadTop();
