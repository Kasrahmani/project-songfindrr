//same geniusScrape using puppeteer, switched due to certain compatibility issue
"use strict";
let puppeteer = module.exports = {};

const puppet = require('puppeteer');

/*  ******* Data types *******
    song objects must have at least the following attributes:
        - (String) title (display title of song)
        - (String) cleanTitle (standard formatted title of song for compare, check source rejex)
        - (String) author (display author of song)
        - (String) cleanAuthor (standard formatted author of song for compare, check source rejex)
        - (String) link (link of song to scrape for lyrics)
        - (string) source (source of obtained song)

****************************** */

/**
 * Perform nightmare scrape on genius search with query
 * @param {string} query is the lyrics wish to be searched
 * @returns {Promise<[objects]>} returns a list of song objects, [false] otherwise
 */
puppeteer.geniusSearch = async function(query) {
    let encodedQuery = encodeURIComponent(query);
    try {
        const browser = await puppet.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true});
        const page = await browser.newPage();
        await page.goto('https://genius.com/search?q=' + encodedQuery, {waitUntil: 'networkidle2'});
        await page.waitForSelector('.full_width_button', {timeout: 3000});
        await page.evaluate(() => {
            if ($('.full_width_button').eq(0).text().replace(/\[]/g, ' ').trim()
                == 'Show more lyric matches') {
                $('.full_width_button').eq(0).click();
            } else if ($('.full_width_button').eq(1).text().replace(/\n/g, ' ').trim()
                == 'Show more lyric matches') {
                $('.full_width_button').eq(1).click();
            }
        });
        await page.waitForSelector('.u-display_block', {timeout: 3000});
        let queriedData = await page.evaluate(() => {
            let queriedData = [false];
            $('.u-display_block').each(function (i, el) {
                if (i === 5) return false;
                let link = $(el).find('.mini_card-thumbnail').parent().attr('href');
                let title = $(el).find('.mini_card-title').text()
                    .replace(/\n/g, '')
                    .trim();
                let cleanTitle = title
                    .replace(/\s/g, '')
                    .replace(/[()'.&?/,-]/g, '')
                    .replace(/\u200B/g, '')
                    .toUpperCase();
                let author = $(el).find('.mini_card-subtitle').text()
                    .replace(/\n/g, '')
                    .trim();
                let cleanAuthor = author
                    .replace(/\s/g, '')
                    .replace(/[()'.&?/,-]/g, '')
                    .replace(/\u200B/g, '')
                    .toUpperCase();
                queriedData[i] = {
                    author: author,
                    title: title,
                    cleanAuthor: cleanAuthor,
                    cleanTitle: cleanTitle,
                    link: link,
                    rating: 5 - i,
                    source: 'genius'
                };
            });
            return queriedData;
        });
        await browser.close();
        return queriedData;
    } catch (error) {
        console.log('Search Query Failed: ' + query + ' ' +error)
        return [false];
    }
};

/**
 * Performs nightmare scrape on nightmare to fetch lyrics of a song
 * @param {string} song link
 * @returns {Promise<string>} returns lyrics if found, false otherwise
 */
puppeteer.getLyrics = async function(link) {
    const browser = await puppet.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true});
    try {
        //const browser = await puppet.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true});
        const page = await browser.newPage();
        await page.goto(link, {waitUntil: 'networkidle2', timeout: '60000'});
        let lyrics = await page.evaluate(() => {
            let lyrics = $('p').eq(0).text().replace(/\[.*?\]/g, "");
            for (let index = 1; index < lyrics.length; index++) {
                if ((lyrics[index] == lyrics[index].toUpperCase())
                    && (lyrics[index].match(/[A-Z]/i))
                    && (lyrics[index - 1] == lyrics[index - 1].toLowerCase())
                    && (lyrics[index - 1].match(/[A-Z]/i))) {
                    lyrics = [lyrics.slice(0, index), lyrics.slice(index)].join('\n');
                    index++;
                }
            }
            return lyrics;
        });
        await page.close();
        await browser.close();
        return lyrics;
    } catch (error) {
        console.log('Lyric Scrape Failed: ' + link + ' ' + error);
        await browser.close();
        return false;
    } finally {
        await browser.close();
    }
};