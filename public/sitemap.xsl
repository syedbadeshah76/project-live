<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap | Edvanz.co</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            padding: 40px 20px;
            line-height: 1.6;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 32px;
            border-radius: 16px;
            margin-bottom: 24px;
            box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.3);
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
          }
          .header p {
            font-size: 15px;
            color: rgba(255, 255, 255, 0.9);
          }
          .stats {
            display: inline-block;
            margin-top: 16px;
            background: rgba(255, 255, 255, 0.2);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
          }
          .table-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          th {
            background: #0f172a;
            color: #94a3b8;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 16px 20px;
            border-bottom: 1px solid #334155;
          }
          td {
            padding: 16px 20px;
            border-bottom: 1px solid #334155;
            font-size: 14px;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:hover td {
            background-color: rgba(255, 255, 255, 0.03);
          }
          a {
            color: #818cf8;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
          .priority-high {
            background: rgba(34, 197, 94, 0.15);
            color: #4ade80;
            border: 1px solid rgba(34, 197, 94, 0.3);
          }
          .priority-medium {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
          }
          .priority-low {
            background: rgba(148, 163, 184, 0.15);
            color: #cbd5e1;
            border: 1px solid rgba(148, 163, 184, 0.3);
          }
          .footer {
            margin-top: 24px;
            text-align: center;
            font-size: 13px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Edvanz XML Sitemap</h1>
            <p>This styled XML sitemap contains all public URLs for Edvanz.co indexed for search engines.</p>
            <div class="stats">
              Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
            </div>
          </div>

          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>URL Location</th>
                  <th>Priority</th>
                  <th>Change Frequency</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <a href="{sitemap:loc}">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <xsl:variable name="p" select="sitemap:priority"/>
                      <span>
                        <xsl:attribute name="class">
                          <xsl:choose>
                            <xsl:when test="$p &gt;= 0.8">badge priority-high</xsl:when>
                            <xsl:when test="$p &gt;= 0.6">badge priority-medium</xsl:when>
                            <xsl:otherwise>badge priority-low</xsl:otherwise>
                          </xsl:choose>
                        </xsl:attribute>
                        <xsl:value-of select="sitemap:priority"/>
                      </span>
                    </td>
                    <td style="color: #94a3b8; text-transform: capitalize;">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </td>
                    <td style="color: #94a3b8;">
                      <xsl:value-of select="sitemap:lastmod"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>

          <div class="footer">
            © <xsl:value-of select="substring(sitemap:urlset/sitemap:url[1]/sitemap:lastmod, 1, 4)"/> Edvanz.co | Styled XML Sitemap
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
