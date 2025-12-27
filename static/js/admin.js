// 管理員頁面初始化
document.addEventListener("DOMContentLoaded", () => {
	// 只有在管理頁才執行
	if (!document.getElementById("uploadBtn")) return;

	loadImagesList();

	const uploadArea = document.getElementById("uploadArea");
	const fileInput = document.getElementById("fileInput");
	const imageInfo = document.getElementById("imageInfo");
	const previewSection = document.getElementById("previewSection");
	const uploadBtn = document.getElementById("uploadBtn");
	const cancelBtn = document.getElementById("cancelBtn");
	const refreshBtn = document.getElementById("refreshBtn");
	let selectedFile = null;

	uploadArea.addEventListener("click", () => fileInput.click());

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

	// 👇 這個函數是管理員專用的，所以放在這裡
	function createImageCard(image) {
		const card = document.createElement("div");
		card.className = "image-card";

		const fileExt = image.filename.split(".").pop().toLowerCase();
		const imageUrl = `/static/uploads/${image.uuid}.${fileExt}`;

		card.innerHTML = `
            <div class="card-image">
                <img src="${imageUrl}" alt="${image.filename}" loading="lazy" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E🖼️%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="card-info">
                <p class="card-filename" style="font-weight:bold;">${
					image.filename
				}</p>
                <p class="card-info-text">${image.info || "無描述"}</p>
                <p class="card-date" style="color:#666; font-size:0.8em;">
                    ${new Date(image.created_at).toLocaleString("zh-TW")}
                </p>
                <button class="card-del-btn" onclick="deleteImage(${
					image.id
				})">🗑️ 刪除</button>
            </div>
        `;

		return card;
	}

	async function loadImagesList() {
		const imagesGrid = document.getElementById("imagesGrid");
		if (!imagesGrid) return;

		try {
			const response = await fetch("/api/images");
			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error("載入圖像列表失敗");
			}

			imagesGrid.innerHTML = "";

			if (data.data.length === 0) {
				imagesGrid.innerHTML =
					'<p class="empty-message">目前沒有任何拾獲物品</p>';
				return;
			}

			data.data.forEach((image) => {
				const imageCard = createImageCard(image);
				imagesGrid.appendChild(imageCard);
			});
		} catch (error) {
			console.error(error);
			imagesGrid.innerHTML = '<p class="error-message">無法載入列表</p>';
		}
	}

	function handleFileSelect(file) {
		if (!file.type.startsWith("image/")) {
			showError("請選擇圖像檔案");
			return;
		}
		selectedFile = file;
		previewImage(file, "previewImage");
		uploadArea.style.display = "none";
		previewSection.style.display = "block";
	}

	cancelBtn.addEventListener("click", () => {
		selectedFile = null;
		fileInput.value = "";
		imageInfo.value = "";
		uploadArea.style.display = "block";
		previewSection.style.display = "none";
	});

	uploadBtn.addEventListener("click", async () => {
		if (!selectedFile) {
			showError("請先選擇圖像");
			return;
		}

		uploadBtn.disabled = true;
		const originalText = uploadBtn.textContent;
		uploadBtn.textContent = "上傳中...";

		await uploadImage(selectedFile, imageInfo.value);

		uploadBtn.disabled = false;
		uploadBtn.textContent = originalText;
	});

	if (refreshBtn) {
		refreshBtn.addEventListener("click", () => loadImagesList());
	}

	async function uploadImage(file, info) {
		setLoading(true);
		const formData = new FormData();
		formData.append("file", file);
		formData.append("info", info);

		try {
			const response = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});
			const data = await response.json();

			if (!response.ok) throw new Error(data.error || "上傳失敗");
			if (!data.success) throw new Error(data.message || "上傳失敗");

			showSuccess("圖像上傳成功！");

			// 重置
			selectedFile = null;
			fileInput.value = "";
			imageInfo.value = "";
			uploadArea.style.display = "block";
			previewSection.style.display = "none";

			loadImagesList();
			setLoading(false);
		} catch (error) {
			showError(error.message);
			setLoading(false);
		}
	}

	window.deleteImage = async function (id) {
		if (!confirm("確定要刪除這筆拾獲物品資料嗎？")) return;

		try {
			const response = await fetch(`/api/images/${id}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (data.success) {
				showSuccess("刪除成功");
				loadImagesList(); // 重新載入列表
			} else {
				alert("刪除失敗: " + (data.error || "未知錯誤"));
			}
		} catch (error) {
			console.error("Error:", error);
			alert("刪除時發生錯誤");
		}
	};
});
