import sql from "./index.js"

const getSummarization = async () => {
    try {
        const response = await sql` 
           SELECT * FROM summarizations order by id ASC
        `;
        return response;
        
    } catch (error) {
        console.log(error);
    }
};

export default getSummarization;