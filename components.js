function dom(html) {
    const div = document.createElement(`div`);
    div.innerHTML = html;
    const children = [];
    for (let i = 0; i < div.children.length; i++) {
        children.push(div.children[i]);
    }
    return children;
}

class ThemeToggle extends HTMLElement {
    darkIcon = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 7C10 10.866 13.134 14 17 14C18.9584 14 20.729 13.1957 21.9995 11.8995C22 11.933 22 11.9665 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C12.0335 2 12.067 2 12.1005 2.00049C10.8043 3.27098 10 5.04157 10 7ZM4 12C4 16.4183 7.58172 20 12 20C15.0583 20 17.7158 18.2839 19.062 15.7621C18.3945 15.9187 17.7035 16 17 16C12.0294 16 8 11.9706 8 7C8 6.29648 8.08133 5.60547 8.2379 4.938C5.71611 6.28423 4 8.9417 4 12Z"/></svg>`;
    lightIcon = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z"/></svg>`;

    connectedCallback() {
        this.render();
        this.style.cursor = "pointer";
    }

    render() {
        this.innerHTML = "";
        const elements = dom(/*html*/ `
        <i class="icon" style="width: 20px;">${
            localStorage.getItem("theme") === "dark" ? this.darkIcon : this.lightIcon
        }</i>
      `);
        this.append(...elements);

        elements[0].addEventListener("click", () => {
            localStorage.setItem("theme", localStorage.getItem("theme") === "dark" ? "light" : "dark");
            document.documentElement.setAttribute("data-theme", localStorage.getItem("theme"));
            this.render();
        });
    }
}
customElements.define("theme-toggle", ThemeToggle);
if (!localStorage.getItem("theme")) {
    localStorage.setItem("theme", "dark");
}
document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") ?? "light");

class ColorBand extends HTMLElement {
    connectedCallback() {
        this.style.display = "block";
        this.innerHTML = /*html*/ `<canvas class="w-full h-full"></canvas>`;

        let colors = [
            "#fe8242",
            "#dd3c5a",
            "#aa3e6c",
            "#fe5d45",
            "#fe9840",
            "#893062",
            "#fd3e4a",
            "#c04267",
            "#ef4159",
            "#fd4d3d",
            "#feab40",
            "#d0486a",
        ];

        const brightness = (color) => {
            const [r, g, b] = color.match(/\w\w/g)?.map((hex) => parseInt(hex, 16)) || [];
            return (r * 299 + g * 587 + b * 114) / 1000;
        };

        colors = colors.sort((a, b) => brightness(b) - brightness(a));

        const canvas = this.querySelector("canvas");
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const ctx = canvas?.getContext("2d");
        if (ctx) {
            const { width, height } = canvas;
            const barHeight = (height / colors.length) | 0;

            colors.forEach((color, index) => {
                const barWidth = width * 0.4;
                const xOffset = width - barWidth - (index * (width - barWidth)) / (colors.length - 1);
                ctx.fillStyle = color;
                ctx.fillRect(
                    xOffset + Math.random() * width * 0.1 - Math.random() * width * 0.1,
                    index * barHeight,
                    barWidth,
                    2
                );
            });
        }
    }
}
customElements.define("color-band", ColorBand);

/* Lightbox — click article images to view full size */
(function() {
    function initLightbox() {
        const overlay = document.createElement("div");
        overlay.className = "lightbox-overlay";
        const overlayImg = document.createElement("img");
        overlay.appendChild(overlayImg);
        document.body.appendChild(overlay);

        function openLightbox(src) {
            overlayImg.src = src;
            overlay.classList.add("active");
        }
        function closeLightbox() {
            overlay.classList.remove("active");
            setTimeout(() => { overlayImg.src = ""; }, 300);
        }

        overlay.addEventListener("click", closeLightbox);
        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") closeLightbox();
        });

        // Event delegation on article element
        document.addEventListener("click", function(e) {
            const img = e.target.closest("article img");
            if (!img) return;
            openLightbox(img.src);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initLightbox);
    } else {
        initLightbox();
    }
})();
