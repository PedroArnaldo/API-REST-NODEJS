import sql  from "./index.js";

const deleteSummarization = async (id) => {
    try {
        const response = await sql` 
            DELETE FROM summarizations WHERE id = ${id}
        `;
        return response;
        
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export default deleteSummarization;