/* eslint-disable arrow-body-style */
/* eslint-disable no-use-before-define */
/* eslint-disable wrap-iife */
/* eslint-disable func-names */
/* eslint-disable global-require */
/* eslint-disable operator-linebreak */
/* eslint-disable no-unused-vars */
(async function () {
  const cheerio = require('cheerio');
  const axios = require('axios').default;
  const { MongoClient } = require('mongodb');

  const URI = 'mongodb://localhost:27017';

  const client = new MongoClient(URI);

  const BASE_ULR = 'https://habr.com';

  const INDEX_URL = `${BASE_ULR}/ru/all/page1/`;

  async function fetchData() {
    const response = await axios.get(INDEX_URL);

    const $ = cheerio.load(response.data);

    const articles = $('.tm-article-snippet__title-link');

    const articleURLs = [];

    articles.each((i, article) => {
      const articlePath = article.attribs.href;
      articleURLs.push(`${articlePath}`);
    });

    const promises = articleURLs.map(async (articleURL) => {
      return scrapArticle(articleURL);
    });

    await Promise.all(promises);
  }

  async function scrapArticle(articlePath) {
    const fetchURL = `${BASE_ULR}${articlePath}`;
    const response = await axios.get(fetchURL);

    const $ = cheerio.load(response.data);

    const content = $('.tm-article-presenter__content');

    const contextAsText = content.text();

    const postId = articlePath.match(/\d+/)[0];
    const commentsURL = `${BASE_ULR}/ru/rss/post/${postId}/?fl=ru`;

    const commentsResponse = await axios.get(commentsURL);

    const $Comments = cheerio.load(commentsResponse.data);

    const commentsAsText = $Comments.text();

    const database = client.db('lab1');
    const articles = database.collection('articles');
    await articles.insertOne({ commentsAsText, contextAsText, postId });
  }

  await fetchData();

  client.close();
})();
