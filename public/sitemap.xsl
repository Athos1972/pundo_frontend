<?xml version="1.0" encoding="UTF-8"?>
<!--
  Sitemap XSLT Stylesheet — pundo_frontend
  Renders /sitemap.xml as a human-readable HTML table in the browser.
  Crawlers (Google, Bing, etc.) read the raw XML directly and ignore this stylesheet.
  SEO-feedback-review-20260603 M7
-->
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="sm">

  <xsl:output method="html" indent="yes" encoding="UTF-8" doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>XML Sitemap — Pundo</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            color: #1A1714;
            background: #F7F5F2;
            padding: 32px 24px;
          }
          header {
            max-width: 960px;
            margin: 0 auto 24px;
          }
          header h1 {
            font-size: 22px;
            font-weight: 700;
            color: #D4622A;
            margin-bottom: 6px;
          }
          header p {
            color: #7A736B;
            font-size: 13px;
          }
          .badge {
            display: inline-block;
            background: #FAE8DF;
            color: #A04515;
            font-weight: 600;
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 999px;
            margin-left: 8px;
            vertical-align: middle;
          }
          table {
            width: 100%;
            max-width: 960px;
            margin: 0 auto;
            border-collapse: collapse;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,.06);
          }
          thead th {
            background: #E5E0D9;
            text-align: left;
            padding: 10px 14px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: #7A736B;
          }
          tbody tr:nth-child(even) { background: #F7F5F2; }
          tbody tr:hover { background: #FAE8DF; }
          td {
            padding: 8px 14px;
            border-top: 1px solid #E5E0D9;
            vertical-align: middle;
          }
          td a {
            color: #D4622A;
            text-decoration: none;
            word-break: break-all;
          }
          td a:hover { text-decoration: underline; }
          .priority { text-align: center; }
          .lastmod, .changefreq { color: #7A736B; white-space: nowrap; }
        </style>
      </head>
      <body>
        <header>
          <h1>
            XML Sitemap
            <span class="badge">
              <xsl:value-of select="count(sm:urlset/sm:url)"/> URLs
            </span>
          </h1>
          <p>
            This sitemap is read by search engines to index pundo.cy.
            You are viewing the human-readable version.
          </p>
        </header>

        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Last Modified</th>
              <th>Change Frequency</th>
              <th class="priority">Priority</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sm:urlset/sm:url">
              <xsl:sort select="sm:priority" data-type="number" order="descending"/>
              <tr>
                <td>
                  <a href="{sm:loc}">
                    <xsl:value-of select="sm:loc"/>
                  </a>
                </td>
                <td class="lastmod">
                  <xsl:value-of select="sm:lastmod"/>
                </td>
                <td class="changefreq">
                  <xsl:value-of select="sm:changefreq"/>
                </td>
                <td class="priority">
                  <xsl:value-of select="sm:priority"/>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
