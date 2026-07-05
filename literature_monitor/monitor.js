/**
 * CPSPP 文献监控系统
 * 每日自动检索QP钢+机器学习文献，AI总结后发送邮件
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { parseString } = require('xml2js');
const nodemailer = require('nodemailer');

// 配置
const CONFIG = {
  email: {
    sender: 'PyuanQAQ@gmail.com',
    password: process.env.EMAIL_PASSWORD || 'kgrw drle xbvv qjss',
    receiver: 'PyuanQAQ@gmail.com',
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587
  },
  search: {
    cpsppKeywords: [
      'quenching partitioning steel',
      'QP steel machine learning',
      'materials informatics steel',
      'advanced high strength steel ML',
      'physics-informed neural network steel',
      'multi-modal materials learning'
    ],
    mlFrontierKeywords: [
      'materials machine learning 2025',
      'physics-informed neural network',
      'graph neural network materials',
      'transformer materials science',
      'generative model materials'
    ],
    maxResults: 5,
    daysBack: 7
  }
};

// 下载文件
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// 搜索arXiv
async function searchArxiv(query, maxResults = 5) {
  const searchQuery = encodeURIComponent(`all:${query}`);
  const url = `http://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  try {
    const xml = await downloadFile(url);
    return new Promise((resolve, reject) => {
      parseString(xml, (err, result) => {
        if (err) return reject(err);

        const entries = result.feed?.entry || [];
        const papers = entries.map(entry => ({
          title: entry.title?.[0]?.replace(/\s+/g, ' ').trim() || '',
          authors: (entry.author || []).slice(0, 3).map(a => a.name?.[0] || ''),
          summary: entry.summary?.[0]?.replace(/\s+/g, ' ').trim().substring(0, 500) || '',
          published: entry.published?.[0]?.substring(0, 10) || '',
          pdfUrl: entry.link?.find(l => l.$.title === 'pdf')?.$.href ||
                  entry.link?.[0]?.$.href?.replace('/abs/', '/pdf/') + '.pdf' || '',
          id: entry.id?.[0] || ''
        }));

        resolve(papers);
      });
    });
  } catch (err) {
    console.error(`  ⚠️ 查询失败: ${err.message}`);
    return [];
  }
}

// 简单关键词提取总结
function generateSummary(title, abstract) {
  const text = (title + ' ' + abstract).toLowerCase();

  const mlMethods = [];
  const mlKeywords = [
    'neural network', 'deep learning', 'CNN', 'RNN', 'LSTM', 'transformer',
    'GNN', 'graph neural', 'random forest', 'XGBoost', 'gradient boosting',
    'SVM', 'regression', 'physics-informed', 'PINN', 'symbolic regression',
    'Bayesian', 'transfer learning', 'active learning', 'autoencoder'
  ];
  mlKeywords.forEach(kw => {
    if (text.includes(kw.toLowerCase())) mlMethods.push(kw);
  });

  const subjects = [];
  const subjectKeywords = [
    'steel', 'alloy', 'metal', 'QP steel', 'AHSS', 'high strength',
    'quenching', 'partitioning', 'martensite', 'austenite',
    'composition', 'microstructure', 'mechanical property'
  ];
  subjectKeywords.forEach(kw => {
    if (text.includes(kw.toLowerCase())) subjects.push(kw);
  });

  return `【机器学习方法】${mlMethods.slice(0, 5).join(', ') || '未明确识别'}

【研究对象】${subjects.slice(0, 5).join(', ') || '未明确识别'}

【主要结论】${abstract.substring(0, 200)}...

【流程框架】详见论文原文`;
}

// 生成HTML邮件
function generateHTML(papersWithSummaries, dateStr) {
  let papersHTML = '';

  if (papersWithSummaries.length === 0) {
    papersHTML = `
      <div style="text-align:center; padding:40px; color:#718096;">
        <h2>📭 今日暂无新文献</h2>
        <p>过去7天内未检索到相关新论文</p>
      </div>`;
  } else {
    papersHTML = `<p style="color:#4a5568;">共检索到 <strong>${papersWithSummaries.length}</strong> 篇相关论文：</p>`;

    papersWithSummaries.forEach((item, i) => {
      const { paper, summary } = item;
      const authorsStr = paper.authors.length >= 3 ?
        paper.authors.join(', ') + ' et al.' : paper.authors.join(', ');

      papersHTML += `
        <div style="background:#f8f9fa; border-left:4px solid #667eea; padding:20px; margin:20px 0; border-radius:0 8px 8px 0;">
          <div style="font-size:18px; font-weight:bold; color:#2d3748; margin-bottom:10px;">
            ${i + 1}. ${paper.title}
          </div>
          <div style="color:#718096; font-size:14px; margin-bottom:15px;">
            👤 ${authorsStr} | 📅 ${paper.published}
          </div>
          <div style="background:white; padding:15px; border-radius:6px; margin-top:10px;">
            <h4 style="color:#667eea; margin-top:0;">📋 论文总结</h4>
            ${summary.replace(/\n/g, '<br>')}
          </div>
          ${paper.pdfUrl ? `<a href="${paper.pdfUrl}" style="display:inline-block; background:#667eea; color:white; padding:8px 20px; text-decoration:none; border-radius:5px; margin-top:10px;">📥 下载PDF</a>` : ''}
        </div>`;
    });
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif; line-height:1.6; color:#333; max-width:900px; margin:0 auto; padding:20px;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:30px; border-radius:10px; margin-bottom:25px;">
    <h1 style="margin:0; font-size:24px;">📚 CPSPP 文献日报</h1>
    <p style="margin:10px 0 0 0; opacity:0.9;">${dateStr} | QP钢 & 机器学习前沿文献监控</p>
  </div>
  ${papersHTML}
  <div style="text-align:center; color:#a0aec0; font-size:12px; margin-top:30px; padding-top:20px; border-top:1px solid #e2e8f0;">
    <p>🤖 由 CPSPP Literature Monitor 自动生成</p>
    <p>QP钢全流程材料设计项目 · 文献监控系统</p>
  </div>
</body>
</html>`;
}

// 发送邮件
async function sendEmail(subject, htmlContent) {
  const transporter = nodemailer.createTransport({
    host: CONFIG.email.smtpServer,
    port: CONFIG.email.smtpPort,
    secure: false,
    auth: {
      user: CONFIG.email.sender,
      pass: CONFIG.email.password
    }
  });

  const mailOptions = {
    from: `"CPSPP Monitor" <${CONFIG.email.sender}>`,
    to: CONFIG.email.receiver,
    subject: subject,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ 邮件发送成功: ${CONFIG.email.receiver}`);
    return true;
  } catch (err) {
    console.error(`❌ 邮件发送失败: ${err.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('📚 CPSPP 文献监控系统');
  console.log('='.repeat(60));

  const today = new Date().toISOString().split('T')[0];
  const dateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  console.log(`\n📅 日期: ${dateStr}`);

  // 收集所有关键词
  const allKeywords = [
    ...CONFIG.search.cpsppKeywords,
    ...CONFIG.search.mlFrontierKeywords
  ];

  // 搜索文献
  console.log(`\n🔍 搜索关键词: ${allKeywords.length} 个`);
  const allPapers = [];
  const seenIds = new Set();

  for (const keyword of allKeywords) {
    console.log(`  搜索: ${keyword.substring(0, 40)}...`);
    const papers = await searchArxiv(keyword, CONFIG.search.maxResults);

    for (const paper of papers) {
      if (!seenIds.has(paper.id) && paper.title) {
        seenIds.add(paper.id);
        allPapers.push(paper);
      }
    }
    console.log(`    → 找到 ${papers.length} 篇`);

    // 避免请求过快
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n📊 去重后共 ${allPapers.length} 篇新论文`);

  // 生成总结
  const papersWithSummaries = allPapers.map(paper => ({
    paper,
    summary: generateSummary(paper.title, paper.summary)
  }));

  // 生成邮件
  console.log(`\n📧 生成邮件...`);
  const htmlContent = generateHTML(papersWithSummaries, dateStr);

  // 保存HTML备份
  const htmlPath = path.join(__dirname, `report_${today}.html`);
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`  💾 HTML备份: ${htmlPath}`);

  // 发送邮件
  const subject = `📚 CPSPP文献日报 | ${dateStr} | ${papersWithSummaries.length}篇新论文`;
  await sendEmail(subject, htmlContent);

  console.log('\n' + '='.repeat(60));
  console.log('✅ 任务完成!');
  console.log('='.repeat(60));
}

main().catch(console.error);
