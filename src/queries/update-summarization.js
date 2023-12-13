import sql from "./index.js";

const updateSummarization = async (id, data) => {
  try {
    const response = await sql` 
        UPDATE summarizations SET 
            title = ${data.title}, 
            link = ${data.link}, 
            startat = ${data.startAt}, 
            endat = ${data.endAt}, 
            transcript = ${data.transcript},
            summary = ${data.summary}
        WHERE id = ${id};
        `;
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export default updateSummarization;
