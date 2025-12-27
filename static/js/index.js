/* */
// 用戶頁面初始化
document.addEventListener("DOMContentLoaded", () => {
	// 只有在首頁才執行
	if (!document.getElementById("searchBtn")) return;

	const uploadArea = document.getElementById("uploadArea");
	const fileInput = document.getElementById("fileInput");
	const previewSection = document.getElementById("previewSection");
	const resultSection = document.getElementById("resultSection");
	const searchBtn = document.getElementById("searchBtn");
	const cancelBtn = document.getElementById("cancelBtn");
	let selectedFile = null;

	// 點擊上傳
	uploadArea.addEventListener("click", () => fileInput.click());

	// 拖放效果
	uploadArea.addEventListener("dragover", (e) => {
		e.preventDefault();
		uploadArea.classList.add("drag-over");
	});
	uploadArea.addEventListener("dragleave", () =>
		uploadArea.classList.remove("drag-over")
	);
	uploadArea.addEventListener("drop", (e) => {
		e.preventDefault();
		uploadArea.classList.remove("drag-over");
		if (e.dataTransfer.files.length > 0)
			handleFileSelect(e.dataTransfer.files[0]);
	});

	fileInput.addEventListener("change", (e) => {
		if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
	});

	function handleFileSelect(file) {
		if (!file.type.startsWith("image/")) {
			showError("請選擇圖像檔案");
			return;
		}
		selectedFile = file;
		previewImage(file, "previewImage");
		uploadArea.style.display = "none";
		previewSection.style.display = "block";
		// 選擇新照片時，先隱藏上次的結果
		resultSection.style.display = "none";
	}

	cancelBtn.addEventListener("click", () => {
		selectedFile = null;
		fileInput.value = "";
		uploadArea.style.display = "block";
		previewSection.style.display = "none";
		resultSection.style.display = "none";
	});

	searchBtn.addEventListener("click", async () => {
		if (!selectedFile) {
			showError("請先選擇圖像");
			return;
		}
		await searchImage(selectedFile);
	});

	async function searchImage(file) {
		setLoading(true);
		resultSection.style.display = "none";

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await fetch("/api/search", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) throw new Error(data.error || "搜尋失敗");
			if (!data.success) throw new Error(data.message || "搜尋失敗");
			if (!data.data || !data.data.image) {
				showError("資料庫中沒有找到相似的圖像");
				setLoading(false);
				return;
			}

			displaySearchResult(data.data);
			setLoading(false);
		} catch (error) {
			showError(error.message);
			setLoading(false);
		}
	}

	function displaySearchResult(result) {
		const similarity = (result.similarity * 100).toFixed(2);
		const scoreElement = document.getElementById("similarityScore");

		let message = "";
		if (result.similarity > 0.85) {
			scoreElement.style.color = "#28a745";
			message = " (高度符合！)";
		} else if (result.similarity > 0.6) {
			scoreElement.style.color = "#ffc107";
			message = " (可能是這個)";
		} else {
			scoreElement.style.color = "#dc3545";
			message = " (相似度低)";
		}

		scoreElement.textContent = `${similarity}% ${message}`;
		document.getElementById("matchedImage").src = result.image_url;
		document.getElementById("matchedFilename").textContent =
			result.image.filename;
		document.getElementById("matchedInfo").textContent =
			result.image.info || "無描述";
		if (result.image.created_at) {
			document.getElementById("matchedDate").textContent = new Date(
				result.image.created_at
			).toLocaleString("zh-TW");
		}

		resultSection.style.display = "block";
		resultSection.scrollIntoView({ behavior: "smooth" });
	}
});
