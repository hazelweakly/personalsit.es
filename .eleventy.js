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

  /**
   * This is used by both the allTags collection as well as the tagMap collection.
   * It's a flattened, not deduplicated, not normalized, complete list of all tags
   * used by all the pages in the website.
   * @param {Posts[]} allPosts
   * @returns {string[]}
   */
  const tagList = (allPosts) =>
    [
      ...new Set(
        allPosts
          .flatMap((item) => item.data.tags)
          .filter(
            (tag) => !!tag && !['all', 'nav', 'post', 'posts'].includes(tag)
          )
      ),
    ].sort();

  // Collect all of the posts that correspond to each tag, storing them all
  // under the same normalized slug.
  // This lets us use 11ty's "automatic tag pages" trick but in a way that
  // actually works when you're not the one writing the tags.
  eleventyConfig.addCollection('tagMap', (collection) => {
    const tags = {};
    tagList(collection.getAll()).forEach((tag) => {
      tags[slugify(tag)] = [
        ...(tags[slugify(tag)] ?? []),
        ...collection.getFilteredByTag(tag),
      ];
    });
    return tags;
  });

  /**
   * allTags needs to be a list of tags that is fully deduplicated.
   * It's used by the tags index page to generate a full list of all tags
   * as well as providing a complete list of tags to the tag.njk page for use
   * as a pagenation object.
   * The fact that the "slug" key is normalized allows us to use it to index
   * into the tagMap collection and retrieve a list of all the posts that have
   * a certain tag. Which is exactly the magic that makes /tags/{{ tag.slug }}/
   * work.
   */
  eleventyConfig.addCollection('allTags', (collection) => {
    const tags = [];
    // What this is doing is just grabbing the first "title" used by someone somewhere.
    // This solves two problems:
    // 1. Sometimes we have tags that use non-latin characters, this will let
    //    us have a usable URL for tags while also making it possible to have
    //    a (probably) correct title.
    //    Really we don't care a lot about whether or not it picks
    //    "Front-end" vs "Front end", but we *do* care about being able to
    //    figure out that the url /tags/ri4-ben3-yu3/ maps to the tag "日本語"
    // 2. By checking (very slowly and inefficiently) this way, we don't get
    //    duplicate tags trying to map to the same page.
    //    This allows a11y, A11Y, A11y, etc., all to map cleanly to /tags/a11y
    //    (otherwise eleventy will, rightfully, throw an error about this)
    tagList(collection.getAll()).forEach((tag) => {
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
