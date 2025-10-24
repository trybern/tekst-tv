document.addEventListener('DOMContentLoaded', () => {
    const headerElement = document.getElementById('teletext-header');
    const contentElement = document.getElementById('content');
    const proxyUrl = '';
    
    const feeds = [
        { name: 'NRK Nyheter', url: 'https://www.nrk.no/nyheter/siste.rss' },
        { name: 'Stor-Oslo', url: 'https://www.nrk.no/stor-oslo/siste.rss' }
    ];
    let currentFeedIndex = 0;

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

    const sportFeed = { name: 'NRK Sport', url: 'https://www.nrk.no/sport/toppsaker.rss' };
    let sportArticles = [];
    let sportPage = 0;
    const sportArticlesPerPage = 10;

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

        if (link.hash === '#sport-next') {
            e.preventDefault();
            sportPage++;
            renderSportPage();
            return;
        }
        if (link.hash === '#sport-prev') {
            e.preventDefault();
            sportPage--;
            renderSportPage();
            return;
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

    // Felles funksjon for å hente og parse RSS-feed
    async function fetchRssFeed(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const str = await response.text();
        const data = new window.DOMParser().parseFromString(str, "text/xml");
        return data.querySelectorAll("item");
    }

    // Felles funksjon for å mappe RSS-items til artikkel-objekter
    function parseRssItems(items, pageStart = 101) {
        return Array.from(items).map((item, index) => {
            // Sjekk etter <category domain="emphasis">high</category>
            let emphasis = '';
            item.querySelectorAll('category').forEach(cat => {
                if (cat.getAttribute('domain') === 'emphasis' && cat.textContent.toLowerCase() === 'high') {
                    emphasis = 'high';
                }
            });
            return {
                id: index,
                page: pageStart + index,
                title: item.querySelector("title").textContent,
                description: item.querySelector("description").textContent,
                link: item.querySelector("link").textContent,
                pubDate: item.querySelector("pubDate").textContent,
                category: item.querySelector("category")?.textContent || '',
                emphasis,
            };
        });
    }

    const fetchNews = async (isSilent = false) => {
        try {
            if (!isSilent) {
                contentElement.innerHTML = 'Laster nyheter...';
            }
            const items = await fetchRssFeed(feeds[currentFeedIndex].url);
            articles = parseRssItems(items, 101);
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

    const updateClock = () => {
        const now = new Date();
        const timeString = `Kl. ${now.toLocaleTimeString('no-NO', { hour12: false })}`;
        const timeElement = headerElement.querySelector('.header-current-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    };

    const renderHeader = (pageTitle) => {
        // Norsk ukedagsforkortelse
        const weekdayShort = ['Sø.', 'Ma.', 'Ti.', 'On.', 'To.', 'Fr.', 'Lø.'];
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const dateString = `${weekdayShort[now.getDay()]} ${day}.${month}.${year}`;
        const timeString = `Kl. ${now.toLocaleTimeString('no-NO', { hour12: false })}`;
        
        const timeHtml = `<div class="header-time-container"><span class="header-time">${dateString}</span><span class="header-current-time">${timeString}</span></div>`;

        // Finn sidetall fra pageTitle (f.eks. "700", "100 (1/5)", "Sport 200")
        let pageNum = null;
        const match = pageTitle.match(/(\d{3,})/);
        if (match) {
            pageNum = parseInt(match[1], 10);
        }
        let navHtml = '';
        if (pageNum && pageNum >= 100 && pageNum <= 999) {
            const prevPage = pageNum === 100 ? 999 : pageNum - 1;
            const nextPage = pageNum === 999 ? 100 : pageNum + 1;
            navHtml = `
                <a href="#${prevPage}" class="header-page-nav-btn" aria-label="gå til side ${prevPage}">&lt;</a>
                <span class="header-page-nav-btn keyboard-button" aria-label="vis tastatur">⌨</span>
                <a href="#${nextPage}" class="header-page-nav-btn" aria-label="gå til side ${nextPage}">&gt;</a>
            `;
        }
        headerElement.innerHTML = `<div class="header-row"><div class="header-page-container"><span class="page-title-header">${pageTitle}</span>${navHtml ? '<span class=\"header-page-nav\">'+navHtml+'</span>' : ''}</div><span class="site-title-header teksttv-title-inline" id="teksttv-title">«Tekst-TV»</span>${timeHtml}</div>`;
        const teksttvTitle = document.getElementById('teksttv-title');
        if (teksttvTitle) {
            teksttvTitle.onclick = () => { window.location.hash = ''; };
        }
        
        // Start the clock if not already running
        if (!window.clockInterval) {
            window.clockInterval = setInterval(updateClock, 1000);
        }
    };

    const renderFrontPage = () => {
        contentElement.className = '';
        const totalPages = Math.ceil(articles.length / articlesPerPage);
        const start = frontPage * articlesPerPage;
        const end = start + articlesPerPage;
        const pageArticles = articles.slice(start, end);

        renderHeader(`100`);

        let html = `<div class=\"frontpage-title\">«Tekst-TV»</div>`;

        let feedSelectorHtml = `<div class="feed-selector">`;
        feeds.forEach((feed, index) => {
            if (index === currentFeedIndex) {
                feedSelectorHtml += `<span class="feed-item active-feed">${feed.name}</span>`;
            } else {
                feedSelectorHtml += `<a href=\"#\" class=\"feed-item\" data-feed-index=\"${index}\">${feed.name}</a>`;
            }
        });
        feedSelectorHtml += `</div>\n`;

        html += feedSelectorHtml;
        pageArticles.forEach((article, idx) => {
            const emphasisDot = article.emphasis === 'high' ? '<span class="emphasis-dot">•</span>' : '';
            if (frontPage === 0 && idx === 0) {
                html += `<a href="#${article.page}" class="front-page-link front-page-lead"><span class="front-page-title front-page-lead-title">${emphasisDot}${article.title}</span><span class="front-page-page">${article.page}</span></a>\n`;
            } else {
                html += `<a href="#${article.page}" class="front-page-link"><span class="front-page-title">${emphasisDot}${article.title}</span><span class="front-page-page">${article.page}</span></a>\n`;
            }
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
    <a href="#200" class="front-page-link"><span class="front-page-title">Sport</span><span class="front-page-page">200</span></a>
        <a href="#300" class="front-page-link"><span class="front-page-title">Været</span><span class="front-page-page">300</span></a>
        <a href="#700" class="front-page-link"><span class="front-page-title">Tipping</span><span class="front-page-page">700</span></a>
        <a href="#800" class="front-page-link"><span class="front-page-title">Om siden</span><span class="front-page-page">800</span></a>
        <a href="#toggle-autoupdate" class="front-page-link"><span class="front-page-title">Auto-oppdatering</span><span class="front-page-page">${autoUpdateEnabled ? 'PÅ' : 'AV'}</span></a>
        <button id="theme-toggle" class="front-page-link theme-toggle-inline"><span class="front-page-title">Fargetema</span><span class="front-page-page">${document.body.classList.contains('light-theme') ? 'Lys' : 'Mørk'}</span></button>
    </div>
</div>
`;
        
        contentElement.innerHTML = html;

        // Koble opp tema-bytte-knappen
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.onclick = () => {
                document.body.classList.toggle('light-theme');
                themeToggle.querySelector('.front-page-page').textContent = document.body.classList.contains('light-theme') ? 'Lys' : 'Mørk';
            };
        }
    };

    const renderArticlePage = (page) => {
        contentElement.className = '';
        const articleIndex = articles.findIndex(a => a.page === page);
        if (articleIndex === -1) {
            // 404-side
            renderHeader(`${page}`);
            contentElement.innerHTML = `
                <div class="frontpage-title-404">404</div>
                <div class="notfound-message">Siden finnes ikke</div>
                <div class="colophon-navigation"><a href="#">Forsiden (100)</a></div>
            `;
            const titleEl = document.querySelector('.frontpage-title-404');
            if (titleEl) {
                titleEl.style.fontFamily = `'Teletext50-UltraCondensed', 'Courier New', Courier, monospace`;
            }
            return;
        }
        const article = articles[articleIndex];

        renderHeader(`${article.page}`);

        let html = '';

        const pubDate = new Date(article.pubDate);
        const time = pubDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

        


        // Vis ascii-djevel på side 666
        if (page === 666) {
            html += `<pre class="ascii-devil">
    (\\_/)
   ( •_•)
  / >\\ 666
 /\\___/\\
   V V
 </pre>`;
        }

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

        html += `<div class="external-link-container"><a href="${article.link}" target="_blank">Les på NRK -></a></div>`;
        
        html += `<div class="autoupdate-footer"><a href="#toggle-autoupdate">Auto-oppdatering: ${autoUpdateEnabled ? 'PÅ' : 'AV'}</a></div>`;

        contentElement.innerHTML = html;
    };

    // Ny funksjon for å splitte og aggregere værdata
    function splitWeatherData(timeseries) {
        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = now.toISOString().split('T')[0];

        // Finn de tre neste timene
        const nextHours = timeseries.filter(item => {
            const t = new Date(item.time);
            return t > now && t.getDate() === now.getDate() && t.getHours() > currentHour;
        }).slice(0, 3);

        // Resten av dagen (fra etter de tre neste timene til midnatt)
        let lastHour = now;
        if (nextHours.length > 0) {
            lastHour = new Date(nextHours[nextHours.length - 1].time);
        }
        const restOfToday = timeseries.filter(item => {
            const t = new Date(item.time);
            return t > lastHour && t.getDate() === now.getDate();
        });

        // De tre neste dagene (oppsummering per dag)
        const days = {};
        timeseries.forEach(item => {
            const t = new Date(item.time);
            const dateStr = item.time.split('T')[0];
            if (t > now && dateStr !== todayStr) {
                if (!days[dateStr]) days[dateStr] = [];
                days[dateStr].push(item);
            }
        });
        const nextThreeDays = Object.keys(days).sort().slice(0, 3).map(dateStr => days[dateStr]);

        return { nextHours, restOfToday, nextThreeDays };
    }

    const renderWeatherPage = async () => {
        contentElement.className = '';
        renderHeader('300');
        contentElement.innerHTML = '<div class="frontpage-title">Været for Oslo</div>Laster værdata...';
        try {
            const lat = 59.9139;
            const lon = 10.7522;
            const url = `https://tekstv-proxy.trygve-bernhardt.workers.dev/?lat=${lat}&lon=${lon}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const timeseries = data.properties.timeseries;
            const split = splitWeatherData(timeseries);
            let html = '<div class="frontpage-title">Været for Oslo</div>';
            html += '<div class="weather-forecasts">';
            // Bygg semantisk tabell med tidspunkt/dagnavn som egen rad
            html += `<table class="weather-table">
                <thead>
                    <tr>
                        <th scope="col">Vær</th>
                        <th scope="col">Temp.</th>
                        <th scope="col">Nedbør</th>
                        <th scope="col">Vind</th>
                    </tr>
                </thead>
                <tbody>`;
            // Samle alle rader i rekkefølge
            const rows = [];
            split.nextHours.forEach(item => {
                const t = new Date(item.time);
                const hour = t.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
                const temp = item.data.instant.details.air_temperature;
                const wind = item.data.instant.details.wind_speed;
                const symbol = item.data.next_1_hours?.summary?.symbol_code || '';
                const symbolText = weatherSymbolTranslations[symbol?.split('_')[0]] || symbol;
                const precip = item.data.next_1_hours?.details?.precipitation_amount ?? 0;
                rows.push({
                    label: hour,
                    symbol: symbolText,
                    temp: `${Math.round(temp)}°`,
                    precip: `${precip.toFixed(1)} mm`,
                    wind: `${wind} m/s`
                });
            });
            if (split.restOfToday.length > 0) {
                let temps = split.restOfToday.map(i => i.data.instant.details.air_temperature);
                let winds = split.restOfToday.map(i => i.data.instant.details.wind_speed);
                let precs = split.restOfToday.map(i => i.data.next_1_hours?.details?.precipitation_amount ?? 0);
                let symbols = {};
                split.restOfToday.forEach(i => {
                    const s = i.data.next_1_hours?.summary?.symbol_code;
                    if (s) symbols[s] = (symbols[s] || 0) + 1;
                });
                let mainSymbol = '';
                let maxCount = 0;
                for (const [symbol, count] of Object.entries(symbols)) {
                    if (count > maxCount) {
                        mainSymbol = symbol;
                        maxCount = count;
                    }
                }
                let symbolText = weatherSymbolTranslations[mainSymbol?.split('_')[0]] || mainSymbol || '–';
                rows.push({
                    label: 'Resten av dagen',
                    symbol: symbolText,
                    temp: `${Math.round(Math.max(...temps))}° / ${Math.round(Math.min(...temps))}°`,
                    precip: `${precs.reduce((a,b)=>a+b,0).toFixed(1)} mm`,
                    wind: `${(winds.reduce((a,b)=>a+b,0)/winds.length).toFixed(1)} m/s`
                });
            }
            split.nextThreeDays.forEach(dayArr => {
                if (!dayArr || dayArr.length === 0) return;
                let temps = dayArr.map(i => i.data.instant.details.air_temperature);
                let winds = dayArr.map(i => i.data.instant.details.wind_speed);
                let precs = dayArr.map(i => i.data.next_1_hours?.details?.precipitation_amount ?? 0);
                let symbols = {};
                dayArr.forEach(i => {
                    const s1 = i.data.next_1_hours?.summary?.symbol_code;
                    const s6 = i.data.next_6_hours?.summary?.symbol_code;
                    const s12 = i.data.next_12_hours?.summary?.symbol_code;
                    [s1, s6, s12].forEach(s => {
                        if (s) symbols[s] = (symbols[s] || 0) + 1;
                    });
                });
                let mainSymbol = '';
                let maxCount = 0;
                for (const [symbol, count] of Object.entries(symbols)) {
                    if (count > maxCount) {
                        mainSymbol = symbol;
                        maxCount = count;
                    }
                }
                let symbolText = weatherSymbolTranslations[mainSymbol?.split('_')[0]] || mainSymbol || '–';
                const t = new Date(dayArr[0].time);
                const dayName = t.toLocaleDateString('no-NO', { weekday: 'long' });
                rows.push({
                    label: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                    symbol: symbolText,
                    temp: `${Math.round(Math.max(...temps))}° / ${Math.round(Math.min(...temps))}°`,
                    precip: `${precs.reduce((a,b)=>a+b,0).toFixed(1)} mm`,
                    wind: `${(winds.reduce((a,b)=>a+b,0)/winds.length).toFixed(1)} m/s`
                });
            });
            // Render alle rader som to <tr> per værpost
            rows.forEach(row => {
                html += `<tr class="weather-time-row"><th scope="row" colspan="5">${row.label}</th></tr>`;
                html += `<tr>
                    <td>${row.symbol}</td>
                    <td>${row.temp}</td>
                    <td>${row.precip}</td>
                    <td>${row.wind}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            html += '</div>';
            html += `<div class="external-link-container"><a href="https://www.yr.no/nb" target="_blank">Se detaljert varsel på Yr.no</a></div>`;
            html += `<div class="colophon-navigation"><a href="#">Tilbake til forsiden (100)</a></div>`;
            html += `<div class="autoupdate-footer"><a href="#toggle-autoupdate">Auto-oppdatering: ${autoUpdateEnabled ? 'PÅ' : 'AV'}</a></div>`;
            contentElement.innerHTML = html;
        } catch (error) {
            console.error("Kunne ikke laste værdata:", error);
            contentElement.innerHTML = `<div class=\"frontpage-title\">Været for Oslo</div>Feil ved lasting av værdata.<br><span class='weather-error-message'>${error.message}</span><br>Prøv å laste siden på nytt, eller besøk <a href='https://www.yr.no/nb' target='_blank'>Yr.no</a> direkte.`;
        }
    };

    const renderColophonPage = () => {
        contentElement.className = '';
        renderHeader(`800`);

        const html = `
            <div class="article-colophon">
                <span class="article-title">OM SIDEN</span>
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

    const renderLottoPage = async () => {
        renderHeader('700');
        contentElement.innerHTML = '<div class="frontpage-title">Lotto</div>Laster resultater...';
        try {
            // Use Cloudflare Worker proxy to avoid CORS issues with Norsk Tipping API
            const response = await fetch('https://lotto.trygve-bernhardt.workers.dev/');
            console.log('Lotto response status:', response.status);
            console.log('Lotto response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.text();
            console.log('Lotto raw response:', data);
            
            const lottoData = JSON.parse(data);
            console.log('Lotto parsed data:', lottoData);
            
            let html = '<div class="frontpage-title">Lotto</div>';
            
            if (lottoData.success && lottoData.mainNumbers && lottoData.mainNumbers.length > 0) {
                // Formater dato hvis tilgjengelig
                if (lottoData.date) {
                    const date = new Date(lottoData.date);
                    const formattedDate = date.toLocaleDateString('nb-NO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    html += `<div class="lotto-date">${formattedDate}</div>`;
                }
                
                // Vis alle tallene samlet
                html += '<div class="lotto-numbers">';
                lottoData.mainNumbers.forEach(number => {
                    html += `<span class="lotto-number">${number}</span>`;
                });
                if (lottoData.extraNumber) {
                    html += `<span class="lotto-number extra">${lottoData.extraNumber}</span>`;
                }
                html += '</div>';
                
                // Lenke til Norsk Tipping rett under tallene
                html += '<div class="lotto-external-link">';
                html += '<a href="https://www.norsk-tipping.no/lotteri/lotto/resultater" target="_blank">Se hos Norsk Tipping</a>';
                html += '</div>';
                
                // Kolofon-lenke til forsiden
                html += '<div class="colophon-navigation">';
                html += '<a href="#" onclick="showPage(100)">Forsiden (100)</a>';
                html += '</div>';
            } else {
                html += '<div class="error-message">Kunne ikke hente Lotto-resultater</div>';
            }
            
            contentElement.innerHTML = html;
            contentElement.className = 'lotto-page';
        } catch (error) {
            console.error('Error fetching lotto data:', error);
            contentElement.innerHTML = '<div class="frontpage-title">Lotto</div><div class="error-message">Feil ved henting av resultater</div>';
            contentElement.className = 'lotto-page';
        }
    };

    async function fetchSport() {
        try {
            const items = await fetchRssFeed(sportFeed.url);
            sportArticles = parseRssItems(items, 201);
        } catch (error) {
            console.error("Kunne ikke laste sportssaker:", error);
            sportArticles = [];
        }
    }

    function renderSportPage() {
        contentElement.className = '';
        renderHeader('200');
        const totalPages = Math.ceil(sportArticles.length / sportArticlesPerPage);
        const start = sportPage * sportArticlesPerPage;
        const end = start + sportArticlesPerPage;
        const pageArticles = sportArticles.slice(start, end);

        let html = `<div class="frontpage-title">Sport</div>`;
        if (pageArticles.length === 0) {
            html += '<div>Laster sportssaker...</div>';
        } else {
            pageArticles.forEach((article, idx) => {
                if (sportPage === 0 && idx === 0) {
                    html += `<a href="#${article.page}" class="front-page-link front-page-lead"><span class="front-page-title front-page-lead-title">${article.title}</span><span class="front-page-page">${article.page}</span></a>\n`;
                } else {
                    html += `<a href="#${article.page}" class="front-page-link"><span class="front-page-title">${article.title}</span><span class="front-page-page">${article.page}</span></a>\n`;
                }
            });
        }
        html += `<div class="pagination-controls">`;
        if (sportPage > 0) {
            html += `<a href="#sport-prev"><- Forrige</a>`;
        } else {
            html += `<span></span>`;
        }
        if (sportPage < totalPages - 1) {
            html += `<a href="#sport-next">Neste -></a>`;
        } else {
            html += `<span></span>`;
        }
        html += `</div>`;
        html += `<div class="colophon-navigation"><a href="#">Forsiden (100)</a></div>`;
        contentElement.innerHTML = html;
    }

    function renderSportArticlePage(page) {
        contentElement.className = '';
        const article = sportArticles.find(a => a.page === page);
        if (!article) {
            renderHeader(`${page}`);
            contentElement.innerHTML = `
                <div class="frontpage-title-404">404</div>
                <div class="notfound-message">Siden finnes ikke</div>
                <div class="colophon-navigation"><a href="#">Forsiden (100)</a></div>
            `;
            return;
        }
        renderHeader(`${article.page}`);
        const pubDate = new Date(article.pubDate);
        const time = pubDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        let html = '<div class="article-navigation">';
        const idx = sportArticles.findIndex(a => a.page === page);
        if (idx > 0) {
            html += `<a href=\"#${sportArticles[idx-1].page}\"><- Forrige</a>`;
        } else {
            html += '<span></span>';
        }
        html += `<a href=\"#200\">Sport (200)</a>`;
        if (idx < sportArticles.length - 1) {
            html += `<a href=\"#${sportArticles[idx+1].page}\">Neste -></a>`;
        } else {
            html += '<span></span>';
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
        html += `<div class="external-link-container"><a href="${article.link}" target="_blank">Les på NRK -></a></div>`;
        html += `<div class="colophon-navigation"><a href="#">Forsiden (100)</a> | <a href="#200">Sport (200)</a></div>`;
        contentElement.innerHTML = html;
    }

    function setMeta(page) {
        let title = '"Tekst-TV"';
        let desc = 'En moderne hyllest til Tekst-TV. Få de siste nyhetene fra NRK og sjekk været, presentert med den klassiske pikselerte estetikken.';

        if (page === 300) {
            title = '"Tekst-TV Vær" – Sjekk været for Oslo i klassisk Tekst-TV-stil';
            desc = 'Sjekk oppdatert værvarsel for Oslo, presentert med den klassiske Tekst-TV-estetikken. Data fra MET Norway.';
        } else if (page === 700) {
            title = '"Tekst-TV Lotto" – Siste Lottoresultater';
            desc = 'Se de nyeste Lotto-tallene fra Norsk Tipping, presentert i ekte Tekst-TV-stil.';
        } else if (page === 800) {
            title = 'Om "Tekst-TV" på nett';
            desc = 'Les mer om Tekst-TV på nett, prosjektets bakgrunn og tekniske detaljer.';
        } else if (page === 200) {
            title = 'Sport 200 – NRK Sport';
            desc = 'Sportssaker fra NRK Sport';
        }

        document.title = title;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', desc);
        }
    }

    const render = () => {
        const hash = window.location.hash;
        let page = 100;
        if (hash) {
            page = parseInt(hash.substring(1));
        }
        setMeta(page);

        if (hash) {
            if (page === 800) {
                renderColophonPage();
            } else if (page === 300) {
                renderWeatherPage();
            } else if (page === 700) {
                renderLottoPage();
            } else if (page === 200) {
                sportPage = 0;
                fetchSport().then(() => renderSportPage());
            } else if (page === 666 && articles.findIndex(a => a.page === 666) === -1) {
                // Spesialside for djevelen
                renderHeader('666');
                contentElement.className = '';
                contentElement.innerHTML = `<pre class="ascii-devil">
    (\\_/)
   ( •_•)
  / >\\ 666 \\
 /\\___/\\
   V V
 </pre>
<div class='colophon-navigation'><a href='#'>Forsiden (100)</a></div>`;
            } else if (!isNaN(page) && page > 100) {
                // Dynamisk grense for sportsartikler
                if (page >= 201 && page < 201 + sportArticles.length) {
                    renderSportArticlePage(page);
                } else {
                    renderArticlePage(page);
                }
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

    // Tema-bytte
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.onclick = () => {
            document.body.classList.toggle('light-theme');
            themeToggle.textContent = document.body.classList.contains('light-theme') ? 'Mørkt tema' : 'Lyst tema';
        };
        // Sett riktig tekst ved lasting
        themeToggle.textContent = document.body.classList.contains('light-theme') ? 'Mørkt tema' : 'Lyst tema';
    }

    // --- Keyboard overlay ---
    // Opprett overlay-elementet (skjult som standard)
    const keyboardOverlay = document.createElement('div');
    keyboardOverlay.id = 'keyboard-overlay';
    // Fjern inline style, la kun id stå igjen
    keyboardOverlay.innerHTML = `
        <div class="keyboard-modal">
            <div class="keyboard-goto-label">Gå til <span id="keyboard-goto-value">...</span></div>
            <div class="keyboard-grid">
                <button class="keyboard-key" data-key="1">1</button>
                <button class="keyboard-key" data-key="2">2</button>
                <button class="keyboard-key" data-key="3">3</button>
                <button class="keyboard-key" data-key="4">4</button>
                <button class="keyboard-key" data-key="5">5</button>
                <button class="keyboard-key" data-key="6">6</button>
                <button class="keyboard-key" data-key="7">7</button>
                <button class="keyboard-key" data-key="8">8</button>
                <button class="keyboard-key" data-key="9">9</button>
                <button class="keyboard-key" data-key="0">0</button>
                <button class="keyboard-cancel">Avbryt</button>
            </div>
        </div>
    `;
    document.body.appendChild(keyboardOverlay);

    let keyboardInput = [];
    function updateKeyboardDisplay() {
        const valueSpan = document.getElementById('keyboard-goto-value');
        let display = '';
        for (let i = 0; i < 3; i++) {
            display += keyboardInput[i] ? keyboardInput[i] : '.';
        }
        valueSpan.textContent = display;
    }
    function openKeyboard() {
        keyboardInput = [];
        updateKeyboardDisplay();
        keyboardOverlay.style.display = 'flex';
        setTimeout(() => {
            keyboardOverlay.classList.add('active');
        }, 10);
    }
    function closeKeyboard() {
        keyboardOverlay.style.display = 'none';
        keyboardOverlay.classList.remove('active');
    }
    // Åpne keyboard når man trykker på .keyboard-button
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.keyboard-button');
        if (btn) {
            openKeyboard();
        }
    });
    // Håndter tastetrykk på grid
    keyboardOverlay.addEventListener('click', (e) => {
        if (e.target.classList.contains('keyboard-key')) {
            if (keyboardInput.length < 3) {
                keyboardInput.push(e.target.dataset.key);
                updateKeyboardDisplay();
                if (keyboardInput.length === 3) {
                    // Naviger til valgt side
                    const pageNum = keyboardInput.join('');
                    closeKeyboard();
                    window.location.hash = `#${pageNum}`;
                }
            }
        } else if (e.target.classList.contains('keyboard-cancel')) {
            closeKeyboard();
        } else if (e.target === keyboardOverlay) {
            closeKeyboard();
        }
    });
    // ESC for å lukke
    document.addEventListener('keydown', (e) => {
        if (keyboardOverlay.style.display !== 'none' && (e.key === 'Escape' || e.key === 'Esc')) {
            closeKeyboard();
        }
        // Backspace for å slette siste tall
        if (keyboardOverlay.style.display !== 'none' && e.key === 'Backspace') {
            if (keyboardInput.length > 0) {
                keyboardInput.pop();
                updateKeyboardDisplay();
            }
            e.preventDefault();
        }
        // Tall direkte fra tastatur
        if (keyboardOverlay.style.display !== 'none' && /^[0-9]$/.test(e.key)) {
            if (keyboardInput.length < 3) {
                keyboardInput.push(e.key);
                updateKeyboardDisplay();
                if (keyboardInput.length === 3) {
                    const pageNum = keyboardInput.join('');
                    closeKeyboard();
                    window.location.hash = `#${pageNum}`;
                }
            }
            e.preventDefault();
        }
    });
});