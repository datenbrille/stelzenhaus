import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    paths: {
      base: process.env.BASE_PATH ?? ''
    },
    prerender: {
      handleHttpError: ({ path, referrer, message }) => {
        if (path === '/favicon.png') return;
        throw new Error(message);
      }
    }
  }
};

export default config;
