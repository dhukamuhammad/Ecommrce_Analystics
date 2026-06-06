// utils/formatDate.js

export const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';

    try {
        // String mein convert kar lo (safety ke liye)
        const strDate = String(dateString);

        // Case 1: Agar date "29-12-2025 15:51" is format me aa rahi hai
        if (strDate.includes('-')) {
            // Space se tod do aur sirf pehla hissa (date) utha lo
            const datePart = strDate.split(' ')[0]; // Result: "29-12-2025"
            
            // Check karo ki format DD-MM-YYYY hai ya YYYY-MM-DD
            const parts = datePart.split('-');
            if (parts.length === 3) {
                // Agar saal (YYYY) pehle hai, toh usko reverse karke DD-MM-YYYY bana do
                if (parts[0].length === 4) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                // Agar already DD-MM-YYYY hai, toh wahi return kardo
                return datePart; 
            }
        }

        // Case 2: Agar standard JavaScript Date format aa jaye (like ISO string)
        const dateObj = new Date(dateString);
        if (!isNaN(dateObj)) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            return `${day}-${month}-${year}`; // Hamesha DD-MM-YYYY return karega
        }

        return strDate; // Agar kuch samajh na aaye toh jaisa hai waisa bhej do
    } catch (e) {
        return dateString;
    }
};