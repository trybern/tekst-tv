document.addEventListener('DOMContentLoaded', () => {
    const headerElement = document.getElementById('teletext-header');
    const contentElement = document.getElementById('content');
    
    const feeds = [
        { name: 'Norge', url: 'https://www.nrk.no/nyheter/siste.rss' },
        { name: 'Stor-Oslo', url: 'https://www.nrk.no/stor-oslo/siste.rss' }
    ];
    let currentFeedIndex = 0;

    // Using a CORS proxy to fetch the RSS feed
    const proxyUrl = 'https://corsproxy.io/?';

    let articles = [];
    let lastUpdated = null;
    let frontPage = 0;
    const articlesPerPage = 5;

    contentElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const feedIndex = e.target.dataset.feedIndex;
            if (feedIndex !== undefined) {
                e.preventDefault();
                const newIndex = parseInt(feedIndex, 10);
                if (newIndex !== currentFeedIndex) {
                    currentFeedIndex = newIndex;
                    fetchNews();
                }
                return;
            }

            if (e.target.hash) {
                if (e.target.hash === '#next') {
                    e.preventDefault();
                    const totalPages = Math.ceil(articles.length / articlesPerPage);
                    if (frontPage < totalPages - 1) {
                        frontPage++;
                        renderFrontPage();
                    }
                } else if (e.target.hash === '#prev') {
                    e.preventDefault();
                    if (frontPage > 0) {
                        frontPage--;
                        renderFrontPage();
                    }
                }
            }
        }
    });

    const fetchNews = async () => {
        try {
            contentElement.innerHTML = 'Laster nyheter...';
            const response = await fetch(proxyUrl + encodeURIComponent(feeds[currentFeedIndex].url));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const str = await response.text();
            const data = new window.DOMParser().parseFromString(str, "text/xml");
            const items = data.querySelectorAll("item");
            
            articles = Array.from(items).map((item, index) => {
                return {
                    id: index,
                    page: 101 + index,
                    title: item.querySelector("title").textContent,
                    description: item.querySelector("description").textContent,
                    link: item.querySelector("link").textContent,
                    pubDate: item.querySelector("pubDate").textContent,
                    category: item.querySelector("category")?.textContent || '',
                };
            });
            lastUpdated = new Date();
            frontPage = 0; // Reset to first page
            render();
        } catch (error) {
            console.error("Kunne ikke laste nyheter:", error);
            contentElement.innerHTML = `Feil ved lasting av nyheter. Sjekk konsollen for detaljer.`;
        }
    };

    const renderHeader = (pageTitle) => {
        let timeString = '';
        if (lastUpdated) {
            timeString = lastUpdated.toLocaleString('no-NO');
        }
        const timeHtml = `<span class="header-time">${timeString}</span>`;
        headerElement.innerHTML = `<div class="header-row"><span class="page-title-header">${pageTitle}</span><span class="site-title-header">NRK NYHETER</span>${timeHtml}</div>`;
    };

    const renderFrontPage = () => {
        const totalPages = Math.ceil(articles.length / articlesPerPage);
        const start = frontPage * articlesPerPage;
        const end = start + articlesPerPage;
        const pageArticles = articles.slice(start, end);

        renderHeader(`Side 100 (${frontPage + 1}/${totalPages})`);

        let feedSelectorHtml = `<div class="feed-selector">`;
        feeds.forEach((feed, index) => {
            if (index === currentFeedIndex) {
                feedSelectorHtml += `<span class="feed-item active-feed">${feed.name}</span>`;
            } else {
                feedSelectorHtml += `<a href="#" class="feed-item" data-feed-index="${index}">${feed.name}</a>`;
            }
        });
        feedSelectorHtml += `</div>\n`;

        let html = feedSelectorHtml;
        pageArticles.forEach(article => {
            html += `<a href="#${article.page}" class="front-page-link"><span class="front-page-title">${article.title}</span><span class="front-page-dots"></span><span class="front-page-page">${article.page}</span></a>\n`;
        });

        html += `\n`;

        html += '<div class="pagination-controls">';
        if (frontPage > 0) {
            html += `<a href="#prev"><- Forrige</a>`;
        } else {
            html += '<span></span>';
        }
        if (frontPage < totalPages - 1) {
            html += `<a href="#next">Neste -></a>`;
        } else {
            html += '<span></span>';
        }
        html += '</div>';

        html += `
<div class="index-section">
    <div class="index-header">Oversikt</div>
    <div class="index-links">
        <a href="#800" class="front-page-link"><span class="front-page-title">Info om siden</span><span class="front-page-dots"></span><span class="front-page-page">800</span></a>
    </div>
</div>
`;
        
        contentElement.innerHTML = html;
    };

    const renderArticlePage = (page) => {
        const articleIndex = articles.findIndex(a => a.page === page);
        if (articleIndex === -1) {
            window.location.hash = '';
            return;
        }
        const article = articles[articleIndex];

        renderHeader(`Side ${article.page}`);

        const pubDate = new Date(article.pubDate);
        const time = pubDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

        const prevArticle = articleIndex > 0 ? articles[articleIndex - 1] : null;
        const nextArticle = articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null;
        
        let html = '<div class="article-navigation">';

        if (prevArticle) {
            html += `<a href="#${prevArticle.page}"><- Forrige</a>`;
        }

        html += `<a href="#">Tilbake til forsiden (100)</a>`;

        if (nextArticle) {
            html += `<a href="#${nextArticle.page}">Neste -></a>`;
        }
        
        html += '</div>';

        const descriptionHtml = article.description
            .split('\n')
            .map(p => `<span class="article-paragraph">${p}</span>`)
            .join('');

        html += `<span class="article-title">${article.title.toUpperCase()}</span>`;
        html += `<span class="time">${time}</span> <span class="article-description">${descriptionHtml}</span>`;
        html += `<span class="published-info">Publisert: ${pubDate.toLocaleString('no-NO')}</span>`;

        contentElement.innerHTML = html;
    };

    const renderColophonPage = () => {
        renderHeader(`Side 800`);

        const html = `
            <div class="article-colophon">
                <span class="article-title">OM DENNE SIDEN</span>
                <span class="article-paragraph">
                    Dette er en hyllest til tekst-TV, <a href="https://veldigsnill.no" target="_blank">laget av Trygve</a>.
                    Her kan du lese nyheter, og etter hvert kanskje mer?
                </span>
                <span class="article-paragraph">
                    Prosjektet bruker fonten "Teletext50", som er laget av
                    <a href="https://github.com/glxxyz/bedstead" target="_blank">glxxyz</a>
                    og er tilgjengelig under en CC0-1.0-lisens.
                </span>
            </div>
            <div class="colophon-navigation">
                <a href="#">Tilbake til forsiden (100)</a>
            </div>
        `;
        contentElement.innerHTML = html;
    };

    const render = () => {
        const hash = window.location.hash;

        if (hash) {
            const page = parseInt(hash.substring(1));
            if (page === 800) {
                renderColophonPage();
            } else if (!isNaN(page) && page > 100) {
                renderArticlePage(page);
            } else {
                frontPage = 0;
                renderFrontPage();
            }
        } else {
            frontPage = 0;
            renderFrontPage();
        }
    };

    window.addEventListener('hashchange', render);
    fetchNews();
});
