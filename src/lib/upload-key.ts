// Every upload lives under a prefix owned by one shop (products) or one user (shop photo),
// so a save can check that a submitted key belongs to whoever submits it.
export const productPrefix = (shopId: string) => `products/${shopId}/`;
export const shopPhotoPrefix = (userId: string) => `shops/${userId}/`;

const NAME = /^[a-f0-9]{32}(-og)?\.(webp|jpg)$/;

export const isOwnKey = (key: string, prefix: string) => key.startsWith(prefix) && NAME.test(key.slice(prefix.length));
