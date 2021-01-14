/*
  The shoppies project
  Copyright (c) 2021 brucehe<bruce.he.62@gmail.com>
  
  See LICENSE.txt for more information
*/

import "antd/dist/antd.css";
import { LoadingOutlined } from "@ant-design/icons";

import { downloadImage } from "./imgApi";

/** _images contains cache images, mapping an id to image data */
const _images = new Map();

/**
 * render an image if data available otherwise render a placeholder,
 * @param {*} id - image's id
 * @param {*} props - props of the img element
 * @param {*} callback - callback fired when img downloaded
 */
export default function ImgRender(id, props = {}, callback) {
  if (!_images.has(id)) {
    // if the cache does not contain the image, download it
    downloadImage(id, "thumbnail")
      .then((resp) => URL.createObjectURL(resp))
      .then((resp) => {
        // put the downloaded image to the cache
        _images.set(id, resp);

        // notify the caller that image data is ready, hence needs to refresh UI
        if (callback) {
          callback("img-downloaded", id);
        }
      });

    //...and render an image placeholder
    //return <img src="./static/image/image-placeholder.png" {...props} alt="" />;

    // alternatively we can render spinning icon
    return <LoadingOutlined {...props} />;
  } else {
    // if the cache contains the image, get it from the cache and render it
    const imgData = _images.get(id);
    return <img src={imgData} {...props} alt="" />;
  }
}
