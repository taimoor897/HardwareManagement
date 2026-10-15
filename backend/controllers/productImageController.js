
const OPENVERSE_API = "https://api.openverse.org/v1/images/";

export const searchProductImages = async (req, res) => {
  try {
    const query = String(
      req.query.query || req.query.q || req.query.productName || ""
    ).trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Enter a product name to search for images.",
      });
    }

    if (query.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Search query must be 150 characters or fewer.",
      });
    }

    const url = new URL(OPENVERSE_API);
    url.search = new URLSearchParams({
      q: query,
      page_size: "18",
      mature: "false",
    }).toString();

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Openverse returned HTTP ${response.status}`);
    }

    const data = await response.json();

    const images = (data.results || [])
      .filter((item) => {
        const license = String(item.license || "").toLowerCase();

        // Exclude non-commercial and unknown licenses.
        return (
          ["by", "by-sa", "by-nd", "cc0", "pdm"].includes(license) &&
          item.url &&
          item.thumbnail
        );
      })
      .map((item) => ({
        title: item.title || "Untitled image",
        url: item.thumbnail,
        originalUrl: item.url,
        source: "openverse",
        sourcePageUrl: item.foreign_landing_url || item.detail_url || "",
        license: item.license || "",
        licenseVersion: item.license_version || "",
        licenseUrl: item.license_url || "",
        attribution:
          item.attribution ||
          `${item.title || "Image"} by ${item.creator || "Unknown creator"}`,
      }));

    return res.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error("Openverse image search error:", error.message);

    return res.status(502).json({
      success: false,
      message: "Image search is temporarily unavailable. Please try again.",
    });
  }
};
