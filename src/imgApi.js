/*
  Bruce's project
  Copyright (c) 2021 brucehe<bruce.he.62@gmail.com>
  
  See LICENSE.txt for more information
*/

import config from "./config";

/**
 * concatenate URI components, to avoid a common error of double slash
 * for example, in stead of https://xxx.com/api/xxx, we are observing https://xxx.com//api/xxx
 * @param {*} p1 - URI component1, typically this is the server url
 * @param {*} p2 - URI component2,
 */
function _concateURIComponents(p1, p2) {
  if (p1.endsWith("/")) {
    if (p2.startsWith("/")) {
      return p1 + p2.substr(1);
    } else {
      return p1 + p2;
    }
  } else {
    if (p2.startsWith("/")) {
      return p1 + p2;
    } else {
      return p1 + "/" + p2;
    }
  }
}

/**
 * a helper function to fetch json response, with proper email/password attached to the request
 * @param {*} url
 * @param {*} method
 * @param {*} body
 */
function _fetchJson(url, method = "GET", body = undefined) {
  return fetch(_concateURIComponents(config.serverUrl, url), {
    method,
    headers: {
      email: config.email,
      password: config.password,
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then((resp) => resp.json());
}

export function getImageList() {
  return _fetchJson(`/api/images`, "GET");
}

export function searchImages(q) {
  return _fetchJson(`/api/images/search?q=${q}`, "GET");
}

export function deleteImage(id) {
  return _fetchJson(`/api/images/${id}`, "DELETE");
}

/**
 * login/or signup, return response (a json object, pls refer to imgreo API for more info)
 * @param {*} needSignup - a flag indicates whether this is a signup, or a login
 */
export function login(needSignup) {
  return fetch(
    _concateURIComponents(config.serverUrl, needSignup ? "api/signup" : "api/login"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: config.email, password: config.password }),
    }
  ).then((resp) => resp.json());
}

/**
 * download an image, return a Blob
 * @param {*} id
 * @param {*} type: either thumbnail or original
 */
export function downloadImage(id, type = "original") {
  return fetch(
    _concateURIComponents(config.serverUrl, `/api/images/${id}?type=${type}`),
    {
      method: "GET",
      headers: {
        email: config.email,
        password: config.password,
      },
    }
  ).then((resp) => {
    return resp.blob();
  });
}
