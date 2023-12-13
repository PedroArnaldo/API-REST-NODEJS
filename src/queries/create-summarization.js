import sql from "./index.js";

const createSummarization = async (data) => {
  try {
    const response = await sql` 
            INSERT INTO summarizations (title, link, startat, endat, transcript, summary) 
            VALUES (${data.title}, ${data.link}, ${data.startAt}, ${data.endAt}, ${data.transcript}, ${data.summary})
        `;
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export default createSummarization;
