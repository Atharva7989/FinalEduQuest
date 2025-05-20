export const generateCertificate = async (req, res) => {
    try {
        const { course } = req.query;
        if (!course) {
            return res.status(400).json({ message: "Course ID is required" });
        }
        return res.status(200).json({ message: "Certificate generated successfully!" });
    } catch (error) {
        console.error("Certificate Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


    