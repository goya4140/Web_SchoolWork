// 主题切换功能
const themeBtn = document.getElementById("themeBtn");

themeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        themeBtn.textContent = "浅色主题";
    } else {
        themeBtn.textContent = "深色主题";
    }
});

// 返回顶部功能
const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", function () {
    if (window.scrollY > 300) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
});

topBtn.addEventListener("click", function () {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

// 表单验证功能
const messageForm = document.getElementById("messageForm");

messageForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (name === "") {
        alert("请输入你的姓名！");
        return;
    }

    if (email === "") {
        alert("请输入你的邮箱！");
        return;
    }

    if (!email.includes("@")) {
        alert("请输入正确的邮箱格式！");
        return;
    }

    if (message === "") {
        alert("请输入留言内容！");
        return;
    }

    alert("留言提交成功！感谢你的留言。");
    messageForm.reset();
});
