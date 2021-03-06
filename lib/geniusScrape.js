// now using puppeteer instead of nightmare for performance
// this is a deprecated file not used on the deployed version or repository
"use strict";
let geniusScrape = module.exports = {};

const path = require('path');
const Nightmare = require('nightmare');

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
 * Performs nightmare scrape on nightmare to fetch lyrics of a song
 * @param {string} song link
 * @returns {Promise<string>} returns lyrics if found, false otherwise
 */
geniusScrape.getLyrics = async function(link) {
    let nightmare = Nightmare({
        waitTimeout: 3000, // in ms
        show: false,
        // load custom preload file
        webPreferences: {
            preload: path.resolve(__dirname, 'custPreload.js')
        }});
    try {
        return await nightmare
            .goto(link)
            .evaluate(() => {
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
            })
            .end();
    } catch (error) {
        console.log('Lyric Scrape Failed: ' + link + ' ' + error);
        return false;
    }
};


/**
 * Perform nightmare scrape on genius search with query
 * @param {string} query is the lyrics wish to be searched
 * @returns {Promise<[objects]>} returns a list of song objects, [false] otherwise
 */
geniusScrape.geniusSearch = async function(query) {
    let encodedQuery = encodeURIComponent(query);
    let nightmare = Nightmare({
        waitTimeout: 3000, // in ms
        show: false,
        // load custom preload file
        webPreferences: {
            preload: path.resolve(__dirname, 'custPreload.js')
        }});
    try {
        return await nightmare
            .goto('https://genius.com/search?q=' + encodedQuery)
            .wait('.full_width_button')
            .evaluate(() => {
                if ($('.full_width_button').eq(0).text().replace(/\[]/g, ' ').trim()
                    == 'Show more lyric matches') {
                    $('.full_width_button').eq(0).click();
                } else if ($('.full_width_button').eq(1).text().replace(/\n/g, ' ').trim()
                    == 'Show more lyric matches') {
                    $('.full_width_button').eq(1).click();
                }
            })
            .wait('.u-display_block')
            .evaluate(() => {
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
            })
            .end();
    } catch(error) {
        console.log('Search Query Failed: ' + query + ' ' +error)
        return [false];
    }
};