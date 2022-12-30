const filenamifyUrl = require('filenamify-url');
const slugify = require('limax');

const rssPlugin = require('@11ty/eleventy-plugin-rss');
// const lazyImagesPlugin = require('eleventy-plugin-lazyimages');

const shuffle = require('./filters/shuffle.js');
const htmlmin = require('html-minifier');

require('dotenv').config();

module.exports = (eleventyConfig) => {
  // Pass through
  eleventyConfig.addPassthroughCopy('assets');

  // Collections
  eleventyConfig.addCollection('sites', (collection) => {
    return collection.getFilteredByGlob('sites/*.md');
  });
  eleventyConfig.addCollection('sitesWithFeeds', (collection) => {
    return collection
      .getFilteredByGlob('sites/*.md')
      .filter((item) => item.data.rss);
  });
  eleventyConfig.addCollection('sitesAlphabetized', (collection) => {
    return collection.getFilteredByGlob('sites/*.md');
  });
  eleventyConfig.addCollection('tagMap', (collection) => {
    const tagList = [
      ...new Set(
        collection
          .getAll()
          .flatMap((item) => item.data.tags)
          .filter(
            (tag) => !!tag && !['all', 'nav', 'post', 'posts'].includes(tag)
          )
      ),
    ];
    const tags = {};
    tagList.forEach((tag) => {
      tags[slugify(tag)] = [
        ...(tags[slugify(tag)] ?? []),
        ...collection.getFilteredByTag(tag),
      ];
    });
    return tags;
  });
  eleventyConfig.addCollection('allTags', (collection) => {
    const tagList = [
      ...new Set(
        collection
          .getAll()
          .flatMap((item) => item.data.tags)
          .filter(
            (tag) => !!tag && !['all', 'nav', 'post', 'posts'].includes(tag)
          )
      ),
    ].sort();
    const tags = [];
    tagList.forEach((tag) => {
      if (!tags.some((t) => t.slug === slugify(tag))) {
        tags.push({ title: tag, slug: slugify(tag) });
      }
    });
    return tags;
  });
  // Plugins
  eleventyConfig.addPlugin(rssPlugin);

  // Filters
  eleventyConfig.addFilter('shuffle', shuffle);
  eleventyConfig.addFilter('slugify', (s) => slugify(s));
  eleventyConfig.addFilter('cleanUrl', (str) => {
    const urlCruft = /http[s]?:\/\/|\/$/gi;
    return str.replace(urlCruft, '');
  });

  // Minify
  eleventyConfig.addTransform('htmlmin', function (content, outputPath) {
    if (outputPath.indexOf('.html') > -1) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
        minifyCSS: true,
      });
      return minified;
    }
    return content;
  });

  // Shortcodes
  eleventyConfig.addShortcode(
    'cloudinaryUrl',
    (path, transforms) =>
      `https://res.cloudinary.com/${
        process.env.CLOUDINARY_CLOUD_NAME
      }/image/upload/${transforms}/${filenamifyUrl(path, {
        replacement: '',
      })}.png`
  );

  // Return config settings
  return {
    markdownTemplateEngine: 'njk',
    passthroughFileCopy: true,
  };
};
