import axios from "axios";

const clientId = process.env.REACT_APP_TWITCH_CLIENT_ID;
const redirectUri = process.env.REACT_APP_TWITCH_REDIRECT_URI;
const scope = "user:read:email"; // Add any other scopes you need

let accessToken = localStorage.getItem("twitch_access_token");
let tokenExpirationTime = localStorage.getItem("twitch_token_expiry");

export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: scope,
  });

  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

export async function handleRedirect() {
  const hash = window.location.hash.substring(1);
  console.log("Hash received from Twitch:", hash);
  const params = new URLSearchParams(hash);

  accessToken = params.get("access_token");
  let expiresIn = params.get("expires_in");

  console.log("Access Token:", accessToken);
  console.log("Expires In:", expiresIn);

  // Fallback if expires_in is missing
  if (!expiresIn) {
    console.warn("Expires In is missing, setting default expiration of 1 hour.");
    expiresIn = 3600; // Default to 1 hour
  }

  if (accessToken && expiresIn) {
    tokenExpirationTime = Date.now() + parseInt(expiresIn, 10) * 1000;
    localStorage.setItem("twitch_access_token", accessToken);
    localStorage.setItem("twitch_token_expiry", tokenExpirationTime);

    // Fetch user information and store the username
    await fetchUserInfo(accessToken);

    return accessToken;
  } else {
    throw new Error("Failed to get access token");
  }
}

async function fetchUserInfo(token) {
  try {
    const response = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
    });

    const user = response.data.data[0]; // Assuming the response contains user data
    if (user) {
      const username = user.login; // Get the Twitch username
      localStorage.setItem("twitch_username", username); // Store the username in local storage
      console.log("Twitch Username:", username);
    }
  } catch (error) {
    console.error("Failed to fetch user info:", error);
  }
}

export function isTokenValid() {
  return accessToken && Date.now() < tokenExpirationTime;
}

export async function getAccessToken() {
  if (!accessToken || Date.now() >= tokenExpirationTime) {
    throw new Error("No valid access token");
  }
  return accessToken;
}

export async function getLiveStatus(channels) {
  const token = await getAccessToken();
  const chunkSize = 100;
  const allLiveData = [];

  for (let i = 0; i < channels.length; i += chunkSize) {
    const channelChunk = channels.slice(i, i + chunkSize);
    const params = new URLSearchParams();
    channelChunk.forEach((channel) => params.append("user_login", channel));

    const response = await axios.get("https://api.twitch.tv/helix/streams", {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
      params: params,
    });

    allLiveData.push(...response.data.data);
  }

  return allLiveData;
}
