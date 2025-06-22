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
    let autoUpdateEnabled = true;
    let autoUpdateInterval = null;

    const weatherSymbolTranslations = {
        clearsky: "Klarvær",
        fair: "Lettskyet",
        partlycloudy: "Delvis skyet",
        cloudy: "Skyet",
        rain: "Regn",
        lightrain: "Lett regn",
        heavyrain: "Kraftig regn",
        rainshowers: "Regnbyger",
        lightrainshowers: "Lette regnbyger",
        heavyrainshowers: "Kraftige regnbyger",
        rainandthunder: "Regn og torden",
        heavyrainandthunder: "Kraftig regn og torden",
        lightrainandthunder: "Lett regn og torden",
        rainshowersandthunder: "Regnbyger og torden",
        lightrainshowersandthunder: "Lette regnbyger og torden",
        heavyrainshowersandthunder: "Kraftige regnbyger og torden",
        sleet: "Sludd",
        lightsleet: "Lett sludd",
        heavysleet: "Kraftig sludd",
        sleetshowers: "Sluddbyger",
        lightsleetshowers: "Lette sluddbyger",
        heavysleetshowers: "Kraftige sluddbyger",
        sleetandthunder: "Sludd og torden",
        lightsleetandthunder: "Lett sludd og torden",
        heavysleetandthunder: "Kraftig sludd og torden",
        sleetshowersandthunder: "Sluddbyger og torden",
        lightsleetshowersandthunder: "Lette sluddbyger og torden",
        heavysleetshowersandthunder: "Kraftige sluddbyger og torden",
        snow: "Snø",
        lightsnow: "Lett snø",
        heavysnow: "Kraftig snø",
        snowshowers: "Snøbyger",
        lightsnowshowers: "Lette snøbyger",
        heavysnowshowers: "Kraftige snøbyger",
        snowandthunder: "Snø og torden",
        lightsnowandthunder: "Lett snø og torden",
        heavysnowandthunder: "Kraftig snø og torden",
        snowshowersandthunder: "Snøbyger og torden",
        lightsnowshowersandthunder: "Lette snøbyger og torden",
        heavysnowshowersandthunder: "Kraftige snøbyger og torden",
        fog: "Tåke",
        lightssleetshowersandthunder: "Lette sluddbyger og torden",
        lightssnowshowersandthunder: "Lette snøbyger og torden",
    };

    contentElement.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        if (link.hash === '#toggle-autoupdate') {
            e.preventDefault();
            autoUpdateEnabled = !autoUpdateEnabled;
            if (autoUpdateEnabled) {
                startAutoUpdate();
            } else {
                stopAutoUpdate();
            }
            render();
            return;
        }
        
        if (link.tagName === 'A') {
            const feedIndex = link.dataset.feedIndex;
            if (feedIndex !== undefined) {
                e.preventDefault();
                const newIndex = parseInt(feedIndex, 10);
                if (newIndex !== currentFeedIndex) {
                    currentFeedIndex = newIndex;
                    fetchNews();
                }
                return;
            }

            if (link.hash) {
                if (link.hash === '#next') {
                    e.preventDefault();
                    const totalPages = Math.ceil(articles.length / articlesPerPage);
                    if (frontPage < totalPages - 1) {
                        frontPage++;
                        renderFrontPage();
                    }
                } else if (link.hash === '#prev') {
                    e.preventDefault();
                    if (frontPage > 0) {
                        frontPage--;
                        renderFrontPage();
                    }
                }
            }
        }
    });

    const stopAutoUpdate = () => {
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
            autoUpdateInterval = null;
            console.log('Auto-oppdatering stoppet.');
        }
    };

    const startAutoUpdate = () => {
        stopAutoUpdate(); // Stopper forrige for å unngå duplikater
        autoUpdateInterval = setInterval(() => {
            console.log('Auto-oppdaterer nyheter...');
            fetchNews(true); // Stille oppdatering
        }, 5 * 60 * 1000);
        console.log('Auto-oppdatering startet (hvert 5. minutt).');
    };

    const fetchNews = async (isSilent = false) => {
        try {
            if (!isSilent) {
                contentElement.innerHTML = 'Laster nyheter...';
            }
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
            if (!isSilent) {
                frontPage = 0; // Reset to first page
            }
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
        <a href="#200" class="front-page-link"><span class="front-page-title">Været</span><span class="front-page-dots"></span><span class="front-page-page">200</span></a>
        <a href="#toggle-autoupdate" class="front-page-link"><span class="front-page-title">Auto-oppdatering</span><span class="front-page-dots"></span><span class="front-page-page">${autoUpdateEnabled ? 'PÅ' : 'AV'}</span></a>
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

        if(article.category) {
            html += article.category.toUpperCase();
        }
        html += `<span class="article-title">${article.title.toUpperCase()}</span>`;
        html += `<span class="time">${time}</span> <span class="article-description">${descriptionHtml}</span>`;
        html += `<span class="published-info">Publisert: ${pubDate.toLocaleString('no-NO')}</span>`;

        html += `<div class="external-link-container"><a href="${article.link}" target="_blank">Les på NRK</a></div>`;
        
        html += `<div class="autoupdate-footer"><a href="#toggle-autoupdate">Auto-oppdatering: ${autoUpdateEnabled ? 'PÅ' : 'AV'}</a></div>`;

        contentElement.innerHTML = html;
    };

    const processWeatherData = (data) => {
        const dailyData = {};
    
        data.properties.timeseries.forEach(item => {
            const date = item.time.split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = {
                    temperatures: [],
                    precipitations: [],
                    symbols: {},
                    windSpeeds: []
                };
            }
            
            if (item.data.instant?.details?.air_temperature !== undefined) {
                dailyData[date].temperatures.push(item.data.instant.details.air_temperature);
            }
            if (item.data.instant?.details?.wind_speed !== undefined) {
                dailyData[date].windSpeeds.push(item.data.instant.details.wind_speed);
            }
    
            if (item.data.next_1_hours?.details?.precipitation_amount !== undefined) {
                dailyData[date].precipitations.push(item.data.next_1_hours.details.precipitation_amount);
            }
    
            if (item.data.next_1_hours?.summary?.symbol_code) {
                const symbol = item.data.next_1_hours.summary.symbol_code;
                const hour = parseInt(item.time.split('T')[1].split(':')[0], 10);
                if (hour >= 11 && hour <= 14) {
                     dailyData[date].daySymbol = symbol;
                }
                dailyData[date].symbols[symbol] = (dailyData[date].symbols[symbol] || 0) + 1;
            }
        });
    
        const processedForecasts = Object.keys(dailyData).map(date => {
            const day = dailyData[date];
            const dayDate = new Date(date);
    
            const now = new Date();
            if (dayDate.setHours(0,0,0,0) < now.setHours(0,0,0,0)) {
                return null;
            }
    
            const dayName = dayDate.toLocaleDateString('no-NO', { weekday: 'long' });
    
            const minTemp = Math.min(...day.temperatures);
            const maxTemp = Math.max(...day.temperatures);
            const totalPrecipitation = day.precipitations.reduce((a, b) => a + b, 0);
            const avgWind = day.windSpeeds.length ? day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length : 0;
            
            let representativeSymbol = day.daySymbol;
            if (!representativeSymbol) {
                representativeSymbol = Object.keys(day.symbols).reduce((a, b) => day.symbols[a] > day.symbols[b] ? a : b, '');
            }
            
            const symbolCode = representativeSymbol.split('_')[0];
    
            return {
                date,
                dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                minTemp: Math.round(minTemp),
                maxTemp: Math.round(maxTemp),
                totalPrecipitation,
                symbol: weatherSymbolTranslations[symbolCode] || symbolCode,
                avgWind: avgWind.toFixed(1)
            };
        }).filter(Boolean);
    
        return processedForecasts;
    };

    const renderWeatherPage = async () => {
        renderHeader('Været for Oslo');
        contentElement.innerHTML = 'Laster værdata...';
        
        try {
            const lat = 59.9139;
            const lon = 10.7522;
            const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
            
            const response = await fetch(url, {
                headers: { 'User-Agent': 'teksttv.veldigsnill.no/1.0 https://github.com/trygve/tekst-tv' }
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            const forecasts = processWeatherData(data).slice(0, 3);
            
            let html = '<div class="weather-forecasts">';

            forecasts.forEach(day => {
                html += `
                    <div class="weather-day">
                        <div class="weather-day-name">${day.dayName}</div>
                        <div class="weather-detail">
                            <span class="weather-label">Vær</span>
                            <span class="weather-value weather-symbol">${day.symbol}</span>
                        </div>
                        <div class="weather-detail">
                            <span class="weather-label">Temp.</span>
                            <span class="weather-value">${day.maxTemp}° / ${day.minTemp}°</span>
                        </div>
                        <div class="weather-detail">
                            <span class="weather-label">Nedbør</span>
                            <span class="weather-value">${day.totalPrecipitation.toFixed(1)} mm</span>
                        </div>
                        <div class="weather-detail">
                            <span class="weather-label">Vind</span>
                            <span class="weather-value">${day.avgWind} m/s</span>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            
            html += `<div class="external-link-container"><a href="https://www.yr.no/nb" target="_blank">Se detaljert varsel på Yr.no</a></div>`;
            html += `<div class="colophon-navigation"><a href="#">Tilbake til forsiden (100)</a></div>`;
            html += `<div class="autoupdate-footer"><a href="#toggle-autoupdate">Auto-oppdatering: ${autoUpdateEnabled ? 'PÅ' : 'AV'}</a></div>`;
            contentElement.innerHTML = html;
    
        } catch (error) {
            console.error("Kunne ikke laste værdata:", error);
            contentElement.innerHTML = `Feil ved lasting av værdata. Sjekk konsollen for detaljer.`;
        }
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
                    Disse sidene er et rent hobbyprosjekt, og er ikke tilknyttet NRK, Yr eller andre tjenester som brukes for å gjenskape følelsen av tekst-TV.
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
            <div class="autoupdate-footer"><a href="#toggle-autoupdate">Auto-oppdatering: ${autoUpdateEnabled ? 'PÅ' : 'AV'}</a></div>
        `;
        contentElement.innerHTML = html;
    };

    const render = () => {
        const hash = window.location.hash;

        if (hash) {
            const page = parseInt(hash.substring(1));
            if (page === 800) {
                renderColophonPage();
            } else if (page === 200) {
                renderWeatherPage();
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
    fetchNews().then(() => {
        if (autoUpdateEnabled) {
            startAutoUpdate();
        }
    });
});
