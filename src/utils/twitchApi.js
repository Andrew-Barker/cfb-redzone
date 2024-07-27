// src/utils/twitchApi.js
import axios from "axios";

const clientId = process.env.REACT_APP_TWITCH_CLIENT_ID;
const clientSecret = process.env.REACT_APP_TWITCH_CLIENT_SECRET;

let accessToken = null;
let tokenExpirationTime = 0;

const getNewAccessToken = async () => {
  const response = await axios.post(
    "https://id.twitch.tv/oauth2/token",
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  accessToken = response.data.access_token;
  // Set expiration time to 2 hours (7200 seconds)
  tokenExpirationTime = Date.now() + 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  return accessToken;
};

export const getAccessToken = async () => {
  if (!accessToken || Date.now() >= tokenExpirationTime) {
    return getNewAccessToken();
  }
  return accessToken;
};

export const getLiveStatus = async (channels) => {
  const chunkSize = 100; // Twitch allows up to 100 user_login parameters per request
  const allLiveData = [];

  for (let i = 0; i < channels.length; i += chunkSize) {
    const channelChunk = channels.slice(i, i + chunkSize);
    const params = new URLSearchParams();
    channelChunk.forEach((channel) => params.append("user_login", channel));

    try {
      const token = await getAccessToken();
      const response = await axios.get("https://api.twitch.tv/helix/streams", {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
        },
        params: params,
      });

      allLiveData.push(...response.data.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Token might be expired, try to get a new one and retry the request
        accessToken = null; // Reset the token
        try {
          const newToken = await getAccessToken();
          const retryResponse = await axios.get("https://api.twitch.tv/helix/streams", {
            headers: {
              "Client-ID": clientId,
              Authorization: `Bearer ${newToken}`,
            },
            params: params,
          });
          allLiveData.push(...retryResponse.data.data);
        } catch (retryError) {
          console.error("Error after token refresh:", retryError);
          throw retryError;
        }
      } else {
        console.error("Error fetching live status:", error);
        throw error;
      }
    }
  }

  return allLiveData;
};
